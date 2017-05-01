import { observe, observable, Action } from "./index"

const dynamicObj = observable({
    actions: {
        viewportStore: {
            instances: new Map<string, {
                childs: string[]
            }>()
        }
    }
})

dynamicObj.actions.viewportStore.instances.set("app1", {
    childs: []
})

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.actions.viewportStore.instances.get("app1").childs.length)
})

class CustomAction {
    @Action someAction() {
        dynamicObj.actions.viewportStore.instances.get("app1").childs.push("a")
    }
}

declare const window: any
window.xxx = dynamicObj.actions.viewportStore.instances.get("app1").childs

const customAction = new CustomAction()
customAction.someAction()

