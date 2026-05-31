import {
  Engine,
  Scene,
  FreeCamera,
  ArcRotateCamera,
  Vector3,
  MeshBuilder,
  Color3,
  Color4,
  StandardMaterial,
  DynamicTexture,
  Observable,
  PointerEventTypes,
  GizmoManager,
  Camera,
  DirectionalLight,
  ShadowGenerator,
  HemisphericLight,
  PBRMaterial,
  Matrix,
  Quaternion,
} from '@babylonjs/core'
import type { FloorPlanObject } from '@/types'
import type { SunPosition } from './SunCalculator'

interface MeshEntry {
  mesh: any
  objType: string
  mesh3D?: any
}

export type ViewMode = 'plan2d' | 'perspective3d' | 'shadowMap'

export class SceneManager {
  private engine: Engine
  private scene: Scene
  private camera2d: FreeCamera
  private camera3d: ArcRotateCamera
  private activeCamera: Camera
  private gridMaterial!: StandardMaterial
  private gizmoManager: GizmoManager
  private canvas: HTMLCanvasElement
  public onObjectPicked = new Observable<{ id: string; type: string } | null>()
  public onSceneClick = new Observable<{ x: number; y: number }>()
  public onSceneDrag = new Observable<{ x: number; y: number }>()
  public objectMeshes = new Map<string, MeshEntry>()
  private isDragging = false
  private dragStart = { x: 0, y: 0 }
  private lastPointerPos = { x: 0, y: 0 }

  private sunLight!: DirectionalLight
  private shadowGenerator!: ShadowGenerator
  private sunHelperMesh: any
  private shadowOverlayMesh: any
  private buildingHeight = 2.8
  private viewMode: ViewMode = 'plan2d'
  private shadowCasters: any[] = []

  private groundMesh!: any

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    })

    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.1, 0.11, 0.14, 1)
    this.scene.shadowsEnabled = true

    this.camera2d = new FreeCamera('camera2d', new Vector3(0, 50, 0), this.scene)
    this.camera2d.mode = Camera.ORTHOGRAPHIC_CAMERA
    this.camera2d.setTarget(Vector3.Zero())
    this.camera2d.upVector = new Vector3(0, 0, -1)
    this.camera2d.name = '2D'

    this.camera3d = new ArcRotateCamera(
      'camera3d',
      -Math.PI / 4,
      Math.PI / 3,
      25,
      new Vector3(0, 0, 0),
      this.scene
    )
    this.camera3d.wheelPrecision = 20
    this.camera3d.minZ = 0.1
    this.camera3d.maxZ = 200
    this.camera3d.name = '3D'
    this.camera3d.upperRadiusLimit = 80
    this.camera3d.lowerRadiusLimit = 5
    this.camera3d.wheelDeltaPercentage = 0.01

    this.activeCamera = this.camera2d
    this.scene.activeCamera = this.activeCamera

    this.updateOrthoSize()

    this.createGround()
    this.setupLighting()
    this.createSunHelper()

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

  private createGround() {
    const gridSize = 100
    this.groundMesh = MeshBuilder.CreateGround('grid', {
      width: gridSize,
      height: gridSize,
      subdivisions: 1,
    }, this.scene)
    this.groundMesh.receiveShadows = true

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
    this.groundMesh.material = this.gridMaterial
    this.groundMesh.isPickable = true
  }

  private setupLighting() {
    const ambient = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    )
    ambient.intensity = 0.25
    ambient.diffuse = new Color3(0.9, 0.95, 1.0)

    this.sunLight = new DirectionalLight(
      'sunLight',
      new Vector3(-1, -2, -0.5),
      this.scene
    )
    this.sunLight.intensity = 1.5
    this.sunLight.diffuse = new Color3(1.0, 0.97, 0.9)
    this.sunLight.specular = new Color3(1.0, 0.95, 0.85)

    this.shadowGenerator = new ShadowGenerator(2048, this.sunLight)
    this.shadowGenerator.useBlurExponentialShadowMap = true
    this.shadowGenerator.blurKernel = 8
    this.shadowGenerator.bias = 0.0001
    this.shadowGenerator.normalBias = 0.02
    this.shadowGenerator.depthScale = 50
  }

  private createSunHelper() {
    this.sunHelperMesh = MeshBuilder.CreateSphere('sunHelper', { diameter: 0.5, segments: 8 }, this.scene)
    const sunMat = new StandardMaterial('sunMat', this.scene)
    sunMat.emissiveColor = new Color3(1, 0.95, 0.7)
    sunMat.diffuseColor = new Color3(1, 0.95, 0.7)
    sunMat.specularColor = Color3.Black()
    this.sunHelperMesh.material = sunMat
    this.sunHelperMesh.isPickable = false
  }

  private sunLightEnabled = true

  updateSunPosition(sunPos: SunPosition) {
    if (!this.sunLightEnabled) return
    const altRad = sunPos.altitude * Math.PI / 180
    const azRad = sunPos.azimuth * Math.PI / 180

    const distance = 60
    const x = distance * Math.sin(azRad) * Math.cos(altRad)
    const y = distance * Math.sin(altRad)
    const z = distance * Math.cos(azRad) * Math.cos(altRad)

    const lightDir = new Vector3(-x, -y, -z).normalize()
    this.sunLight.direction = lightDir
    this.sunLight.intensity = sunPos.altitude > 0 ? Math.max(0.3, 1.5 * Math.sin(altRad)) : 0.1

    if (sunPos.altitude <= 0) {
      this.sunLight.diffuse = new Color3(0.4, 0.5, 0.7)
      this.sunLight.specular = new Color3(0.5, 0.55, 0.7)
    } else if (sunPos.altitude < 10) {
      this.sunLight.diffuse = new Color3(1.0, 0.65, 0.35)
      this.sunLight.specular = new Color3(1.0, 0.6, 0.3)
    } else {
      this.sunLight.diffuse = new Color3(1.0, 0.97, 0.9)
      this.sunLight.specular = new Color3(1.0, 0.95, 0.85)
    }

    this.sunHelperMesh.position = new Vector3(x, y, z)
    const sunMat = this.sunHelperMesh.material as StandardMaterial
    if (sunPos.altitude <= 0) {
      sunMat.emissiveColor = new Color3(0.3, 0.35, 0.5)
    } else if (sunPos.altitude < 10) {
      sunMat.emissiveColor = new Color3(1, 0.55, 0.25)
    } else {
      sunMat.emissiveColor = new Color3(1, 0.95, 0.7)
    }
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode

    this.objectMeshes.forEach((entry) => {
      if (entry.mesh) entry.mesh.setEnabled(mode === 'plan2d')
      if (entry.mesh3D) entry.mesh3D.setEnabled(mode !== 'plan2d')
    })

    if (mode === 'plan2d') {
      this.activeCamera = this.camera2d
      this.sunLight.intensity = 0
      this.sunLightEnabled = false
      this.shadowCasters.forEach((caster) => {
        caster.receiveShadows = false
      })
      this.sunHelperMesh.setEnabled(false)
      this.groundMesh.isPickable = true
      this.groundMesh.receiveShadows = false
      this.scene.activeCamera = this.camera2d
      this.camera2d.attachControl(this.canvas, false)
      this.camera3d.detachControl()
    } else if (mode === 'perspective3d') {
      this.activeCamera = this.camera3d
      this.sunLight.intensity = 1.5
      this.sunLightEnabled = true
      this.shadowCasters.forEach((caster) => {
        caster.receiveShadows = true
      })
      this.sunHelperMesh.setEnabled(true)
      this.groundMesh.isPickable = true
      this.groundMesh.receiveShadows = true
      this.scene.activeCamera = this.camera3d
      this.camera3d.attachControl(this.canvas, true)
      this.camera2d.detachControl()
    } else if (mode === 'shadowMap') {
      this.activeCamera = this.camera2d
      this.sunLight.intensity = 1.5
      this.sunLightEnabled = true
      this.shadowCasters.forEach((caster) => {
        caster.receiveShadows = true
      })
      this.sunHelperMesh.setEnabled(false)
      this.groundMesh.isPickable = true
      this.groundMesh.receiveShadows = true
      this.scene.activeCamera = this.camera2d
      this.camera2d.attachControl(this.canvas, false)
      this.camera3d.detachControl()
      this.showShadowOverlay()
    }
  }

  private showShadowOverlay() {
    if (!this.shadowOverlayMesh) {
      this.shadowOverlayMesh = MeshBuilder.CreatePlane('shadowOverlay', {
        width: 100,
        height: 100,
      }, this.scene)
      this.shadowOverlayMesh.rotation.x = Math.PI / 2
      this.shadowOverlayMesh.position.z = 0.01
      this.shadowOverlayMesh.isPickable = false

      const shadowMat = new StandardMaterial('shadowOverlayMat', this.scene)
      shadowMat.diffuseColor = new Color3(0, 0, 0)
      shadowMat.alpha = 0.01
      shadowMat.backFaceCulling = false
      this.shadowOverlayMesh.material = shadowMat
    }
    this.shadowOverlayMesh.setEnabled(true)
  }

  hideShadowOverlay() {
    if (this.shadowOverlayMesh) {
      this.shadowOverlayMesh.setEnabled(false)
    }
  }

  async exportShadowMap(filename: string = 'shadow-map.png') {
    const prevMode = this.viewMode
    if (prevMode !== 'shadowMap') {
      this.setViewMode('shadowMap')
    }

    await new Promise((r) => setTimeout(r, 100))
    this.scene.render()
    const dataUrl = await this.engine.readPixels(0, 0, this.canvas.width, this.canvas.height)
    if (!dataUrl) {
      console.error('Failed to read pixels')
      return
    }

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.canvas.width
    tempCanvas.height = this.canvas.height
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return

    const imageData = new ImageData(
      new Uint8ClampedArray(dataUrl as any),
      this.canvas.width,
      this.canvas.height
    )

    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
      const isShadow = brightness < 120

      if (isShadow) {
        data[i] = 20
        data[i + 1] = 20
        data[i + 2] = 25
        data[i + 3] = 220
      } else {
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)

    const link = document.createElement('a')
    link.download = filename
    link.href = tempCanvas.toDataURL('image/png')
    link.click()

    if (prevMode !== 'shadowMap') {
      this.setViewMode(prevMode)
    }
  }

  private updateOrthoSize() {
    const aspect = this.engine.getAspectRatio(this.camera2d)
    const orthoSize = 25
    this.camera2d.orthoTop = orthoSize
    this.camera2d.orthoBottom = -orthoSize
    this.camera2d.orthoLeft = -orthoSize * aspect
    this.camera2d.orthoRight = orthoSize * aspect
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
              const pt = this.getWorldPos()
              if (pt) {
                this.dragStart = { x: pt.x, y: pt.y }
                this.lastPointerPos = { x: pt.x, y: pt.y }
              }
              return
            }
          }
          this.onObjectPicked.notifyObservers(null)
          break
        }
        case PointerEventTypes.POINTERMOVE: {
          const pt = this.getWorldPos()
          if (pt) {
            if (this.isDragging && this.viewMode === 'plan2d') {
              const dx = pt.x - this.lastPointerPos.x
              const dy = pt.y - this.lastPointerPos.y
              this.onSceneDrag.notifyObservers({ x: dx, y: dy })
              this.lastPointerPos = { x: pt.x, y: pt.y }
            }
            this.onSceneClick.notifyObservers({ x: pt.x, y: pt.y })
          }
          break
        }
        case PointerEventTypes.POINTERUP: {
          this.isDragging = false
          break
        }
        case PointerEventTypes.POINTERWHEEL: {
          if (this.viewMode !== 'plan2d') break
          const wheelEvent = pointerInfo.event as WheelEvent
          const delta = wheelEvent.deltaY > 0 ? 1.05 : 0.95
          const top = this.camera2d.orthoTop as number
          const bottom = this.camera2d.orthoBottom as number
          const left = this.camera2d.orthoLeft as number
          const right = this.camera2d.orthoRight as number
          this.camera2d.orthoTop = top * delta
          this.camera2d.orthoBottom = bottom * delta
          this.camera2d.orthoLeft = left * delta
          this.camera2d.orthoRight = right * delta
          break
        }
      }
    })
  }

  private getWorldPos(): { x: number; y: number } | null {
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
      if (
        data.mesh === mesh ||
        data.mesh3D === mesh ||
        data.mesh?.getChildren?.().includes(mesh) ||
        data.mesh3D?.getChildren?.().includes(mesh)
      ) {
        return { id, type: data.objType }
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

    const wallHeight = wall.height || this.buildingHeight
    const mesh3D = MeshBuilder.CreateBox(`wall3d_${obj.id}`, {
      width: length,
      height: wallHeight,
      depth: wall.thickness,
    }, this.scene)

    mesh3D.position = new Vector3(
      (wall.startX + wall.endX) / 2,
      (wall.startY + wall.endY) / 2,
      wallHeight / 2
    )
    mesh3D.rotationQuaternion = Quaternion.RotationYawPitchRoll(-angle, 0, 0)
    mesh3D.metadata = { objectId: obj.id, objectType: obj.type }
    mesh3D.receiveShadows = true

    const mat3D = new PBRMaterial(`wall3dMat_${obj.id}`, this.scene)
    const c3D = Color3.FromHexString(wall.color || '#d0d0d0')
    mat3D.albedoColor = c3D
    mat3D.metallic = 0.0
    mat3D.roughness = 0.85
    mesh3D.material = mat3D

    mesh3D.setEnabled(this.viewMode !== 'plan2d')

    this.shadowGenerator.addShadowCaster(mesh3D, true)
    this.shadowCasters.push(mesh3D)

    this.objectMeshes.set(obj.id, { mesh, mesh3D, objType: obj.type })
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

    const doorHeight = 2.1
    const mesh3D = MeshBuilder.CreateBox(`door3d_${obj.id}`, {
      width: door.width,
      height: doorHeight,
      depth: 0.08,
    }, this.scene)

    mesh3D.position = new Vector3(door.position, 0, doorHeight / 2)
    mesh3D.metadata = { objectId: obj.id, objectType: obj.type }

    const mat3D = new PBRMaterial(`door3dMat_${obj.id}`, this.scene)
    const c3D = Color3.FromHexString(door.color || '#8b6914')
    mat3D.albedoColor = c3D
    mat3D.metallic = 0.3
    mat3D.roughness = 0.6
    mesh3D.material = mat3D

    mesh3D.setEnabled(this.viewMode !== 'plan2d')

    this.shadowGenerator.addShadowCaster(mesh3D, true)
    this.shadowCasters.push(mesh3D)

    this.objectMeshes.set(obj.id, { mesh, mesh3D, objType: obj.type })
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

    const sillHeight = win.sillHeight || 0.9
    const winHeight = win.height || 1.5
    const mesh3D = MeshBuilder.CreateBox(`window3d_${obj.id}`, {
      width: win.width,
      height: winHeight,
      depth: 0.06,
    }, this.scene)

    mesh3D.position = new Vector3(win.position, 0, sillHeight + winHeight / 2)
    mesh3D.metadata = { objectId: obj.id, objectType: obj.type }

    const mat3D = new PBRMaterial(`window3dMat_${obj.id}`, this.scene)
    const c3D = Color3.FromHexString(win.color || '#4fc3f7')
    mat3D.albedoColor = c3D
    mat3D.metallic = 0.1
    mat3D.roughness = 0.2
    mat3D.alpha = 0.4
    mat3D.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND
    mesh3D.material = mat3D

    mesh3D.setEnabled(this.viewMode !== 'plan2d')

    this.shadowGenerator.addShadowCaster(mesh3D, true)
    this.shadowCasters.push(mesh3D)

    this.objectMeshes.set(obj.id, { mesh, mesh3D, objType: obj.type })
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
    const ctx = labelTexture.getContext() as any
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

    const furnHeight = this.getFurnitureHeight(furn.subType)
    const mesh3D = MeshBuilder.CreateBox(`furn3d_${obj.id}`, {
      width: furn.width,
      height: furnHeight,
      depth: furn.depth,
    }, this.scene)

    mesh3D.position = new Vector3(furn.x, furn.y, furnHeight / 2)
    mesh3D.rotationQuaternion = Quaternion.RotationYawPitchRoll(-furn.rotation, 0, 0)
    mesh3D.metadata = { objectId: obj.id, objectType: obj.type }

    const mat3D = new PBRMaterial(`furn3dMat_${obj.id}`, this.scene)
    const c3D = Color3.FromHexString(furn.color || '#7a6e5d')
    mat3D.albedoColor = c3D
    mat3D.metallic = 0.05
    mat3D.roughness = 0.8
    mesh3D.material = mat3D

    mesh3D.setEnabled(this.viewMode !== 'plan2d')

    this.shadowGenerator.addShadowCaster(mesh3D, true)
    this.shadowCasters.push(mesh3D)

    this.objectMeshes.set(obj.id, { mesh, mesh3D, objType: obj.type })
  }

  private getFurnitureHeight(subType: string): number {
    const heights: Record<string, number> = {
      bed: 0.5, table: 0.75, chair: 0.9, sofa: 0.85,
      desk: 0.75, cabinet: 1.2, bathtub: 0.6,
      toilet: 0.4, sink: 0.85, stove: 0.9,
    }
    return heights[subType] || 0.7
  }

  removeObjectFromScene(id: string) {
    const entry = this.objectMeshes.get(id)
    if (entry) {
      entry.mesh.dispose()
      if (entry.mesh3D) {
        this.shadowCasters = this.shadowCasters.filter((c) => c !== entry.mesh3D)
        entry.mesh3D.dispose()
      }
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
      if (entry.mesh3D) {
        const mat3D = entry.mesh3D.material as PBRMaterial
        if (mat3D) {
          mat3D.emissiveColor = new Color3(0, 0.83, 0.67)
        }
      }
    }
  }

  clearHighlights() {
    this.objectMeshes.forEach((entry) => {
      const mat = entry.mesh.material as StandardMaterial
      if (mat) {
        mat.emissiveColor = Color3.Black()
      }
      if (entry.mesh3D) {
        const mat3D = entry.mesh3D.material as PBRMaterial
        if (mat3D) {
          mat3D.emissiveColor = Color3.Black()
        }
      }
    })
  }

  updateObjectPosition(id: string, dx: number, dy: number) {
    const entry = this.objectMeshes.get(id)
    if (entry) {
      entry.mesh.position.x += dx
      entry.mesh.position.y += dy
      if (entry.mesh3D) {
        entry.mesh3D.position.x += dx
        entry.mesh3D.position.y += dy
      }
    }
  }

  getObjectIds(): string[] {
    return Array.from(this.objectMeshes.keys())
  }

  getViewMode(): ViewMode {
    return this.viewMode
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
      if (entry.mesh3D) entry.mesh3D.dispose()
    })
    this.objectMeshes.clear()
    this.engine.dispose()
  }
}
