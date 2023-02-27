const CalibrateBasisToolName = 'calibratebasis-tool';

class CalibrateBasisTool extends Autodesk.Viewing.ToolInterface {
  constructor(viewer, options) {
    super();
    this.viewer = viewer;
    this.names = [CalibrateBasisToolName];
    this.active = false;
    this.snapper = null;
    this.points = [];
    // Hack: delete functions defined on the *instance* of a ToolInterface (we want the tool controller to call our class methods instead)
    delete this.register;
    delete this.deregister;
    delete this.activate;
    delete this.deactivate;
    delete this.getPriority;
    delete this.handleMouseMove;
    delete this.handleSingleClick;
    delete this.handleKeyUp;
  }

  register() {
    this.snapper = new Autodesk.Viewing.Extensions.Snapping.Snapper(this.viewer, { renderSnappedGeometry: false, renderSnappedTopology: false });
    this.viewer.toolController.registerTool(this.snapper);
    this.viewer.toolController.activateTool(this.snapper.getName());
    console.log('CalibrateBasisTool registered.');
  }

  deregister() {
    this.viewer.toolController.deactivateTool(this.snapper.getName());
    this.viewer.toolController.deregisterTool(this.snapper);
    this.snapper = null;
    console.log('CalibrateBasisTool unregistered.');
  }

  activate(name, viewer) {
    if (!this.active) {
      console.log('CalibrateBasisTool activated.');
      this.active = true;
    }
  }

  deactivate(name) {
    if (this.active) {
      console.log('CalibrateBasisTool deactivated.');
      this.active = false;
      this._reset();
    }
  }

  getPriority() {
    return 13; // Feel free to use any number higher than 0 (which is the priority of all the default viewer tools)
  }

  handleMouseMove(event) {
    if (!this.active) {
      return false;
    }

    this.snapper.indicator.clearOverlays();
    if (this.snapper.isSnapped()) {
      // this.viewer.clearSelection();
      const result = this.snapper.getSnapResult();
      const { SnapType } = Autodesk.Viewing.MeasureCommon;
      this.snapper.indicator.render(); // Show indicator when snapped to a vertex
    }
    return false;
  }

  handleSingleClick(event, button) {
    if (!this.active) {
      return false;
    }

    if (button === 0 && this.snapper.isSnapped()) {
      const result = this.snapper.getSnapResult();
      const { SnapType } = Autodesk.Viewing.MeasureCommon;
      this.points.push(result.intersectPoint.clone());

      if (this.points.length == 4) {
        if (this.arePointsCoplanar()) {
          return true;
        }

        this._update();
        this.deactivate();
        this._reset();
        return true; // Stop the event from going to other tools in the stack
      }
    }
    return false;
  }

  arePointsCoplanar() {
    let v12 = this.points[1].clone().sub(this.points[0]);
    let v13 = this.points[2].clone().sub(this.points[0]);
    let v14 = this.points[3].clone().sub(this.points[0]);
    return Math.abs(v12.cross(v13).dot(v14)) < 0.0001;
  }

  handleKeyUp(event, keyCode) {
    if (this.active) {
      if (keyCode === 27) {
        // Finalize the extrude mesh and initialie a new one
        this.points = [];
        return true;
      }
    }
    return false;
  }

  _update() {
    let v12 = this.points[1].clone().sub(this.points[0]);
    let v13 = this.points[2].clone().sub(this.points[0]);
    this.basis1 = this.points[1].clone().sub(this.points[0]);
    let line12 = new THREE.Line3(this.points[0], this.points[1]);
    let plane123 = (new THREE.Plane()).setFromCoplanarPoints(this.points[0], this.points[1], this.points[2]);
    let auxPoint = line12.closestPointToPoint(this.points[2], false);
    this.basis2 = this.points[2].clone().sub(auxPoint);
    let auxDistance = plane123.distanceToPoint(this.points[3]);
    let auxVector = v12.cross(v13);
    this.basis3 = auxVector.normalize().multiplyScalar(auxDistance);

    let auxbaseMatrix = new THREE.Matrix4();
    this.baseOrigin = this.points[0].clone();
    this.obliqueVector = this.basis1.clone().add(this.basis2.clone()).add(this.basis3.clone());
    // this.spaceBase = auxbaseMatrix.clone().makeBasis(this.basis1, this.basis2, this.basis3);
    this.spaceBaseNormal = auxbaseMatrix.clone().makeBasis(this.basis1.clone().normalize(), this.basis2.clone().normalize(), this.basis3.clone().normalize());
  }

  _reset() {
    this.points = [];
  }
}

class CalibrateBasisExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this._button = null;
    this.tool = new CalibrateBasisTool(viewer);
    this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
  }

  async onModelLoaded(model) {

  }

  async load() {
    await this.viewer.loadExtension('Autodesk.Snapping');
    this.viewer.toolController.registerTool(this.tool);
    this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
    return true;
  }

  unload() {
    if (this._button) {
      this.removeToolbarButton(this._button);
      this._button = null;
    }
    return true;
  }

  onToolbarCreated() {
    const controller = this.viewer.toolController;
    this._button = this.createToolbarButton('coordinatesextension-button', 'https://img.icons8.com/small/30/null/place-marker.png', 'Calibrate coordinates basis points');
    this._button.onClick = () => {
      if (controller.isToolActivated(CalibrateBasisToolName)) {
        controller.deactivateTool(CalibrateBasisToolName);
        this._button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      } else {
        controller.activateTool(CalibrateBasisToolName);
        this._button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      }
    };
  }

  createToolbarButton(buttonId, buttonIconUrl, buttonTooltip) {
    let group = this.viewer.toolbar.getControl('coordinates-toolbar-group');
    if (!group) {
      group = new Autodesk.Viewing.UI.ControlGroup('coordinates-toolbar-group');
      this.viewer.toolbar.addControl(group);
    }
    const button = new Autodesk.Viewing.UI.Button(buttonId);
    button.setToolTip(buttonTooltip);
    group.addControl(button);
    const icon = button.container.querySelector('.adsk-button-icon');
    if (icon) {
      icon.style.backgroundImage = `url(${buttonIconUrl})`;
      icon.style.backgroundSize = `24px`;
      icon.style.backgroundRepeat = `no-repeat`;
      icon.style.backgroundPosition = `center`;
    }
    return button;
  }

  removeToolbarButton(button) {
    const group = this.viewer.toolbar.getControl('coordinates-toolbar-group');
    group.removeControl(button);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension('CalibrateBasisExtension', CalibrateBasisExtension);