import {
  Engine,
  Scene,
  FreeCamera,
  Vector3,
  MeshBuilder,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  Observable,
  PointerEventTypes,
  GizmoManager,
  OrthoCamera,
} from '@babylonjs/core'
import type { FloorPlanObject } from '@/types'

export class SceneManager {
  private engine: Engine
  private scene: Scene
  private camera: FreeCamera
  private gridMaterial!: StandardMaterial
  private gizmoManager: GizmoManager
  private canvas: HTMLCanvasElement
  public onObjectPicked = new Observable<{ id: string; type: string } | null>()
  public onSceneClick = new Observable<{ x: number; y: number }>()
  public onSceneDrag = new Observable<{ x: number; y: number }>()
  private objectMeshes = new Map<string, { mesh: any; highlight?: any }>()
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private lastPointerPos = { x: 0, y: 0 }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })

    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.1, 0.11, 0.14, 1)

    this.camera = new FreeCamera('camera', new Vector3(0, 50, 0), this.scene)
    this.camera.mode = OrthoCamera.ORTHOGRAPHIC_CAMERA
    this.camera.setTarget(Vector3.Zero())
    this.camera.upVector = new Vector3(0, 0, -1)

    this.updateOrthoSize()

    this.createGrid()

    this.gizmoManager = new GizmoManager(this.scene)
    this.gizmoManager.positionGizmoEnabled = false
    this.gizmoManager.rotationGizmoEnabled = false
    this.gizmoManager.scaleGizmoEnabled = false
    this.gizmoManager.usePointerToAttachGizmos = false

    this.setupInteraction()

    this.engine.runRenderLoop(() => {
      this.scene.render()
    })

    window.addEventListener('resize', () => {
      this.engine.resize()
      this.updateOrthoSize()
    })
  }

  private updateOrthoSize() {
    const aspect = this.engine.getAspectRatio(this.camera)
    const orthoSize = 25
    this.camera.orthoTop = orthoSize
    this.camera.orthoBottom = -orthoSize
    this.camera.orthoLeft = -orthoSize * aspect
    this.camera.orthoRight = orthoSize * aspect
  }

  private createGrid() {
    const gridSize = 100
    const gridMesh = MeshBuilder.CreateGround('grid', {
      width: gridSize,
      height: gridSize,
      subdivisions: 1,
    }, this.scene)

    this.gridMaterial = new StandardMaterial('gridMat', this.scene)
    const gridTexture = new DynamicTexture('gridTex', 1024, this.scene, true)
    const ctx = gridTexture.getContext()

    ctx.fillStyle = '#1a1d23'
    ctx.fillRect(0, 0, 1024, 1024)

    const step = 1024 / gridSize
    ctx.strokeStyle = '#2a3040'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= gridSize; i++) {
      const pos = i * step
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, 1024)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(1024, pos)
      ctx.stroke()
    }

    const majorStep = step * 5
    ctx.strokeStyle = '#3a4555'
    ctx.lineWidth = 1
    for (let i = 0; i <= gridSize / 5; i++) {
      const pos = i * majorStep
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, 1024)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(1024, pos)
      ctx.stroke()
    }

    gridTexture.update()
    this.gridMaterial.diffuseTexture = gridTexture
    this.gridMaterial.specularColor = Color3.Black()
    this.gridMaterial.emissiveTexture = gridTexture
    this.gridMaterial.backFaceCulling = false
    gridMesh.material = this.gridMaterial
    gridMesh.isPickable = false
  }

  private setupInteraction() {
    this.scene.onPointerObservable.add((pointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN: {
          const pickResult = this.scene.pick(
            this.scene.pointerX,
            this.scene.pointerY
          )
          if (pickResult?.hit && pickResult.pickedMesh) {
            const meshData = this.findObjectByMesh(pickResult.pickedMesh)
            if (meshData) {
              this.onObjectPicked.notifyObservers(meshData)
              this.isDragging = true
              const pt = this.getWorldPos(pointerInfo)
              if (pt) {
                this.dragStart = { x: pt.x, y: pt.z }
                this.lastPointerPos = { x: pt.x, y: pt.z }
              }
              return
            }
          }
          this.onObjectPicked.notifyObservers(null)
          break
        }
        case PointerEventTypes.POINTERMOVE: {
          const pt = this.getWorldPos(pointerInfo)
          if (pt) {
            if (this.isDragging) {
              const dx = pt.x - this.lastPointerPos.x
              const dy = pt.z - this.lastPointerPos.y
              this.onSceneDrag.notifyObservers({ x: dx, y: dy })
              this.lastPointerPos = { x: pt.x, y: pt.z }
            }
            this.onSceneClick.notifyObservers({ x: pt.x, y: pt.z })
          }
          break
        }
        case PointerEventTypes.POINTERUP: {
          this.isDragging = false
          break
        }
      }
    })

    this.scene.onPointerWheel = (_evt) => {
      const delta = _evt.deltaY > 0 ? 1.05 : 0.95
      const top = this.camera.orthoTop as number
      const bottom = this.camera.orthoBottom as number
      const left = this.camera.orthoLeft as number
      const right = this.camera.orthoRight as number
      this.camera.orthoTop = top * delta
      this.camera.orthoBottom = bottom * delta
      this.camera.orthoLeft = left * delta
      this.camera.orthoRight = right * delta
    }
  }

  private getWorldPos(pointerInfo: any): { x: number; y: number } | null {
    const pickResult = this.scene.pick(
      this.scene.pointerX,
      this.scene.pointerY
    )
    if (pickResult?.hit && pickResult.pickedPoint) {
      return { x: pickResult.pickedPoint.x, y: pickResult.pickedPoint.z }
    }
    return null
  }

  private findObjectByMesh(mesh: any): { id: string; type: string } | null {
    for (const [id, data] of this.objectMeshes) {
      if (data.mesh === mesh || data.mesh.getChildren?.().includes(mesh)) {
        const obj = this.objectMeshes.get(id)
        return { id, type: (obj as any)?._type || 'unknown' }
      }
    }

    if (mesh.metadata?.objectId) {
      return { id: mesh.metadata.objectId, type: mesh.metadata.objectType || 'unknown' }
    }
    return null
  }

  addObjectToScene(obj: FloorPlanObject) {
    this.removeObjectFromScene(obj.id)

    switch (obj.type) {
      case 'wall':
        this.createWallMesh(obj)
        break
      case 'door':
        this.createDoorMesh(obj)
        break
      case 'window':
        this.createWindowMesh(obj)
        break
      case 'furniture':
        this.createFurnitureMesh(obj)
        break
    }
  }

  private createWallMesh(obj: FloorPlanObject) {
    const wall = obj as any
    const dx = wall.endX - wall.startX
    const dy = wall.endY - wall.startY
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const mesh = MeshBuilder.CreateBox(`wall_${obj.id}`, {
      width: length,
      height: wall.thickness,
      depth: 0.1,
    }, this.scene)

    mesh.position = new Vector3(
      (wall.startX + wall.endX) / 2,
      (wall.startY + wall.endY) / 2,
      0
    )
    mesh.rotation.z = -angle
    mesh.metadata = { objectId: obj.id, objectType: obj.type }

    const mat = new StandardMaterial(`wallMat_${obj.id}`, this.scene)
    const c = Color3.FromHexString(wall.color || '#e8e8e8')
    mat.diffuseColor = c
    mat.emissiveColor = c.scale(0.5)
    mat.specularColor = Color3.Black()
    mat.backFaceCulling = false
    mesh.material = mat

    this.objectMeshes.set(obj.id, { mesh, _type: obj.type })
  }

  private createDoorMesh(obj: FloorPlanObject) {
    const door = obj as any
    const mesh = MeshBuilder.CreateBox(`door_${obj.id}`, {
      width: door.width,
      height: 0.1,
      depth: 0.12,
    }, this.scene)

    mesh.position = new Vector3(door.position, 0, 0)
    mesh.metadata = { objectId: obj.id, objectType: obj.type }

    const mat = new StandardMaterial(`doorMat_${obj.id}`, this.scene)
    const c = Color3.FromHexString(door.color || '#8b6914')
    mat.diffuseColor = c
    mat.emissiveColor = c.scale(0.3)
    mat.specularColor = Color3.Black()
    mat.backFaceCulling = false
    mat.alpha = 0.9
    mesh.material = mat

    const arcMesh = MeshBuilder.CreateLines(`doorArc_${obj.id}`, {
      points: this.createDoorArcPoints(door.width, door.openDirection),
    }, this.scene)
    arcMesh.position = mesh.position.clone()
    arcMesh.color = new Color3(0.55, 0.41, 0.08)

    this.objectMeshes.set(obj.id, { mesh, _type: obj.type })
  }

  private createDoorArcPoints(width: number, direction: string): Vector3[] {
    const points: Vector3[] = []
    const steps = 16
    const dir = direction === 'left' ? -1 : 1
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * (Math.PI / 2) * dir
      points.push(new Vector3(Math.cos(angle) * width, Math.sin(angle) * width, 0.11))
    }
    return points
  }

  private createWindowMesh(obj: FloorPlanObject) {
    const win = obj as any
    const mesh = MeshBuilder.CreateBox(`window_${obj.id}`, {
      width: win.width,
      height: 0.1,
      depth: 0.12,
    }, this.scene)

    mesh.position = new Vector3(win.position, 0, 0)
    mesh.metadata = { objectId: obj.id, objectType: obj.type }

    const mat = new StandardMaterial(`windowMat_${obj.id}`, this.scene)
    const c = Color3.FromHexString(win.color || '#4fc3f7')
    mat.diffuseColor = c
    mat.emissiveColor = c.scale(0.4)
    mat.specularColor = Color3.Black()
    mat.backFaceCulling = false
    mat.alpha = 0.7
    mesh.material = mat

    const line1 = MeshBuilder.CreateLines(`winLine1_${obj.id}`, {
      points: [
        new Vector3(-win.width / 2, 0, 0.11),
        new Vector3(win.width / 2, 0, 0.11),
      ],
    }, this.scene)
    line1.position = mesh.position.clone()
    line1.color = new Color3(0.31, 0.76, 0.97)

    const line2 = MeshBuilder.CreateLines(`winLine2_${obj.id}`, {
      points: [
        new Vector3(0, -0.04, 0.11),
        new Vector3(0, 0.04, 0.11),
      ],
    }, this.scene)
    line2.position = mesh.position.clone()
    line2.color = new Color3(0.31, 0.76, 0.97)

    this.objectMeshes.set(obj.id, { mesh, _type: obj.type })
  }

  private createFurnitureMesh(obj: FloorPlanObject) {
    const furn = obj as any
    const mesh = MeshBuilder.CreateBox(`furn_${obj.id}`, {
      width: furn.width,
      height: furn.depth,
      depth: 0.15,
    }, this.scene)

    mesh.position = new Vector3(furn.x, furn.y, 0)
    mesh.rotation.z = -furn.rotation
    mesh.metadata = { objectId: obj.id, objectType: obj.type }

    const mat = new StandardMaterial(`furnMat_${obj.id}`, this.scene)
    const c = Color3.FromHexString(furn.color || '#7a6e5d')
    mat.diffuseColor = c
    mat.emissiveColor = c.scale(0.3)
    mat.specularColor = Color3.Black()
    mat.backFaceCulling = false
    mat.alpha = 0.85
    mesh.material = mat

    const labelTexture = new DynamicTexture(`furnLabel_${obj.id}`, 256, this.scene, true)
    const ctx = labelTexture.getContext()
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const subTypeLabels: Record<string, string> = {
      bed: '床', table: '桌', chair: '椅', sofa: '沙发',
      desk: '书桌', cabinet: '柜', bathtub: '浴缸',
      toilet: '卫', sink: '洗手', stove: '灶',
    }
    ctx.fillText(subTypeLabels[furn.subType] || furn.subType, 128, 128)
    labelTexture.update()

    const labelPlane = MeshBuilder.CreatePlane(`furnLabelPlane_${obj.id}`, {
      width: Math.min(furn.width * 0.6, 1.2),
      height: Math.min(furn.depth * 0.6, 1.2),
    }, this.scene)
    labelPlane.position = mesh.position.clone()
    labelPlane.position.z = 0.16
    labelPlane.rotation.z = -furn.rotation
    labelPlane.isPickable = false

    const labelMat = new StandardMaterial(`furnLabelMat_${obj.id}`, this.scene)
    labelMat.diffuseTexture = labelTexture
    labelMat.emissiveTexture = labelTexture
    labelMat.specularColor = Color3.Black()
    labelMat.backFaceCulling = false
    labelMat.useAlphaFromDiffuseTexture = true
    labelPlane.material = labelMat

    this.objectMeshes.set(obj.id, { mesh, _type: obj.type })
  }

  removeObjectFromScene(id: string) {
    const entry = this.objectMeshes.get(id)
    if (entry) {
      entry.mesh.dispose()
      this.objectMeshes.delete(id)
    }
  }

  highlightObject(id: string) {
    this.clearHighlights()
    const entry = this.objectMeshes.get(id)
    if (entry) {
      const mat = entry.mesh.material as StandardMaterial
      if (mat) {
        mat.emissiveColor = new Color3(0, 0.83, 0.67)
      }
    }
  }

  clearHighlights() {
    this.objectMeshes.forEach((entry, id) => {
      const mat = entry.mesh.material as StandardMaterial
      if (mat) {
        mat.emissiveColor = Color3.Black()
      }
    })
  }

  updateObjectPosition(id: string, dx: number, dy: number) {
    const entry = this.objectMeshes.get(id)
    if (entry) {
      entry.mesh.position.x += dx
      entry.mesh.position.y += dy
    }
  }

  getScene() {
    return this.scene
  }

  getEngine() {
    return this.engine
  }

  dispose() {
    this.objectMeshes.forEach((entry) => {
      entry.mesh.dispose()
    })
    this.objectMeshes.clear()
    this.engine.dispose()
  }
}
