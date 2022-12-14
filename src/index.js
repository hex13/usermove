export class Controller {
    constructor(el, opts = {}) {
        this.el = el;
        this.handlers = {};
        this.opts = opts;
        this.pointers = {};
    }
    createPointerInfo(e, isDown) {
        return {start: e, last: e, isDown};
    }
    init() {
        this.on('touchmove', e => {
            e.domEvent.preventDefault();
        });
        this.on('pointerdown', e => {
            const pointerInfo = this.createPointerInfo(e, true);
            this.pointers[e.domEvent.pointerId] = pointerInfo;
            return pointerInfo;
        });
        this.on('pointermove', e => {
            let pointerInfo = this.pointers[e.domEvent.pointerId];
            if (!pointerInfo) pointerInfo = this.createPointerInfo(e, false);

            const pointerCount = Object.keys(this.pointers).length;
            pointerInfo.current = e;
            if (!pointerInfo.isDown) return;

            if (pointerCount == 1) {
                interpolate(pointerInfo.last, e, interpolated => {
                    const delta = {
                        x: interpolated.x - pointerInfo.start.x,
                        y: interpolated.y - pointerInfo.start.y,
                    };
                    delta.angle = Math.atan2(delta.y, delta.x);
                    delta.distance = Math.hypot(delta.x, delta.y);
                    this.dispatch({ ...interpolated, type: 'usermove:drag', start: {...pointerInfo.start}, delta, isPrimary: e.isPrimary});
                });
            } else if (pointerCount == 2) {
                const [a, b] = Object.values(this.pointers);

                const originalDistance = Math.hypot(a.start.x - b.start.x, a.start.y - b.start.y);
                const currentDistance = Math.hypot(a.current.x - b.current.x, a.current.y - b.current.y);

                const originalRotation = Math.atan2(a.start.y - b.start.y, a.start.x - b.start.x); 
                const currentRotation = Math.atan2(a.current.y - b.current.y, a.current.x - b.current.x); 

                this.dispatch({type: 'usermove:gesture', distance: currentDistance - originalDistance, rotation: currentRotation - originalRotation})
            }
            pointerInfo.last = e;
        });
        this.on('pointerup', e => {
            delete this.pointers[e.domEvent.pointerId];
        });
    }
    dispatch(e) {
        if (Object.hasOwn(this.handlers, e.type)) {
            this.handlers[e.type].forEach(handler => handler(e));
        }
    }
    mapEvent(e) {
        const boundingRect = this.el.getBoundingClientRect();
        const x = e.clientX - boundingRect.x;
        const y = e.clientY - boundingRect.y;
        const transformedEvent = { type: e.type, x, y, down: this.down, domEvent: e, start: { ...this.start}, isPrimary: e.isPrimary };
        if (this.opts.transformEvent) this.opts.transformEvent(transformedEvent);
        return transformedEvent;
    }
    on(eventName, handler) {
        if (!this.handlers[eventName]) {
            this.handlers[eventName] = [];
            this.el.addEventListener(eventName, e => {
                this.dispatch(this.mapEvent(e));
            });
        }
        this.handlers[eventName].push(handler);
    }

}


function interpolate(from, to, cb) {
    const distX = to.x - from.x;
    const distY = to.y - from.y;
    const dist = Math.hypot(distX, distY);
    const stepX = distX / dist;
    const stepY = distY / dist; 
    let x = from.x;
    let y = from.y;
    for (let a = 0; a < dist; a += 1) {
        cb({x, y});
        x += stepX;
        y += stepY;
    }
}