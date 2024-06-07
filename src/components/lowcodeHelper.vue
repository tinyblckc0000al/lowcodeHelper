<template>
    <div class="container">
        <div style="width:30%;">
            <el-container>
                <el-header>页面结构</el-header>
                <el-main>
                    <el-tree :data="vnodeTree" node-key="id" default-expand-all @node-drag-start="handleDragStart"
                        @node-drag-enter="handleDragEnter" @node-drag-leave="handleDragLeave"
                        @node-drag-over="handleDragOver" @node-drag-end="handleDragEnd" @node-drop="handleDrop"
                        draggable :allow-drop="allowDrop" :allow-drag="allowDrag">
                        <template v-slot="{ node, data }">
                            <span class="custom-tree-node">
                                <span> {{ node.label }}</span>
                                <span>
                                    <el-button type="text" size="mini" @click.stop="">
                                        编辑
                                    </el-button>
                                    <el-button type="text" size="mini" @click.stop="createChildNode(node,data)">
                                        新增子节点
                                    </el-button>
                                    <el-button type="text" size="mini" @click="() => remove(node, data)">
                                        删除
                                    </el-button>
                                </span>
                            </span>
                        </template>
                    </el-tree>
                </el-main>
            </el-container>
        </div>
        <div style="width:30%;">
            <el-container>
                <el-header>节点配置</el-header>
                <el-main>
                    <!-- <el-form ref="tmpConfig" :model="tmpConfig" label-width="80px">
                        <el-form-item v-for="item in configItems" :key="item.id" :label="item.label"
                            :value="item.value">
                            <el-input v-model="tmpConfig[item.value]"></el-input>
                        </el-form-item>
                    </el-form> -->
                    <div style="float:right">
                        <el-button @click="cancelChange">取 消</el-button>
                        <el-button type="primary" @click="changeOptions(tmpConfig)">确 定</el-button>
                    </div>
                </el-main>
            </el-container>
        </div>
        <div style="width:30%;">
            <el-container>
                <el-header>生成代码</el-header>
                <el-button @click="generateCode">生成拼接代码</el-button>
                <el-button @click="generateVNode">生成虚拟节点代码</el-button>
                <el-main>
                    {{ generatedCode }}
                    <hr />
                    <p>预览</p>
                    <div ref="preview">
                        <span id="testId" class="testClass">hello, lowcode.
                            <div id="testId" class="testClass">
                                child 1
                                <el-button @click="alert('hello')">btn</el-button>
                            </div>
                            <span id="testId" class="testClass" style="color:red">child 2</span>
                            <el-input class="single-input" v-model="inputValue"></el-input>
                        </span>
                    </div>
                </el-main>
            </el-container>
        </div>
        <el-dialog class="create-dialog" v-model="createVisible" title="创建" width="40%">
            <el-form ref="createDialog" :model="tmpConfig" label-width="80px">
                <el-form-item prop="label" label="节点名">
                    <el-select v-model="newNodeType">
                        <el-option v-for="item in availableComponentsList" :key="item" :label="item"
                            :value="item"></el-option>
                    </el-select>
                </el-form-item>
                <template v-if="newNodeType">
                    <div v-for="key in Object.keys(tmpConfig.data.attrs)" :key="key" :label="key">
                        <!-- <el-input v-model="tmpConfig.data.attrs[key]" clearable></el-input> -->
                        <span>{{ key }}: {{ tmpConfig.data.attrs[key] }}</span>
                    </div>
                </template>
                <el-button @click.prevent="appendProp(domain)"><i
                        class="el-icon-circle-plus-outline"></i>新增属性</el-button>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="() => createVisible = false">取 消</el-button>
                    <el-button type="primary" @click="() => append()">确 定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import componentsConfigMap from '@/materials/componentsConfig.js'
import { ref, reactive, computed, watch, nextTick, h } from 'vue'
import '@/assets/lowcodeHelper.css'
//配置字段
    const configItems = [
    // { value: 'label', label: 'label' }, // 标签名
    // { value: 'data', label: 'data' }, // 属性，事件，样式
    // { value: 'children', label: 'children' }, // 子节点
    // { value: 'key', label: 'key' }, // 用于diff
    { value: 'text', label: 'text' }, // 节点文本
    // { value: 'elm', label: 'elm' }, // 真实节点
    ]
    const newNodeType = ref(undefined)
    //当前点击的节点 ps:不一定跟curConfig完全对应,取决于操作，新增子节点的curNode是父节点，编辑的curNode是当前节点。
    const curNode = ref({
        node: {},
        data: {},
    })
    // 节点配置临时数据
    let tmpConfig = ref({
        parentKey: '',
        key: '',
        label: '',
        data: {
            attrs: {
                'id': ''
            },
            text: ''
        },
        children: []
    })
    // 页面结构树
    let vnodeTree = ref([{
        label: 'div',
        data: {
            attrs: {
                id: 'container',
                class: 'container',
            },
            text: ''
        },
    }])
    // 生成的代码
    let generatedCode = ref({
        template: '',
        script: '',
        style: ''
    })
    // 控制新建节点弹窗
    let createVisible = ref(false)

String.prototype.insertSubstr = function (index, str) {
    if (isNaN(index)) throw Error("Insertion index is not number type.");
    let pos = 0;
    let rawLen = this.length;
    if (index < 0) {
        pos = rawLen + index;
    } else {
        if (index < rawLen) pos = index;
        else {
            throw Error("Insertion index is out of bounds: the function of insert requires index to be smaller than length.");
        }
    }
    let res = this.substring(0, pos + 1) + str + this.substring(pos + 1, pos + rawLen);
    return res;
}
function insertTemplate(template = '', vNodes = []) {
    if (!vNodes.length) return
    for (let cfg of vNodes) {
        // const tmpNode = h(cfg.label,cfg.data,cfg.children)
        let { children, data, label: tag, text, key, parent } = cfg//tmpNode
        // console.log('tmpNode: ', tmpNode);
        let labelStart = `<${tag}>`
        let labelEnd = `</${tag}>`
        let childrenTemplate = ''
        if (children && children.length) childrenTemplate = insertTemplate(childrenTemplate, children)
        console.log('parent: ', parent);
        console.log('key: ', key);
        // console.log('text: ', text);
        console.log('tag: ', tag);
        console.log('data: ', data);
        console.log('children', children, childrenTemplate)
        text = data.text
        for (let k in data.attrs) {
            if (['text'].includes(k)) continue
            let attrStr = ` ${k}="${JSON.parse(JSON.stringify(data.attrs[k]))}"`
            if (data.attrs[k]) {
                labelStart = labelStart.insertSubstr(-2, attrStr)
            }
        }
        let dom = `${labelStart}${text ? text : ''}${childrenTemplate}${labelEnd}`
        template += dom
        console.log('dom', dom, template)
    }
    return template
}
function insertScript(script = '', vNodes = []) {
    if (!vNodes.length) return
    for (let cfg of vNodes) {
        const { children, data } = cfg
        let childrenScript = ''
        if (children && children.length) childrenScript = insertScript(childrenScript, children)
        for (let k in data.attrs) {
            console.log('k,v', k, data.attrs[k])
            // if(['text'].includes(k)) continue
            // let attrStr =  ` ${k}="${JSON.parse(JSON.stringify(data.attrs[k]))}"`
            // if(data.attrs[k]) {
            //     labelStart = labelStart.insertSubstr(-2, attrStr)
            // }
        }
    }
}
function insertVnode(tree, node, parentKey) {
}
let availableComponentsList = computed(() => {
    // console.log('this.componentsConfigMap: ', componentsConfigMap);
    return Object.keys(componentsConfigMap)
})
watch(newNodeType, (nv,ov) => {
    try{
        console.log('nv,ov', nv,ov)
        if(nv) {
            let vnode = componentsConfigMap[newNodeType.value]
            console.log('vnode: ', vnode, newNodeType.value);
            tmpConfig.value = JSON.parse(JSON.stringify(vnode))
            tmpConfig.value.key = Date.now()
            console.log('vnode', vnode, 'tmpConfig.value', tmpConfig.value)
            // newNodeType = nv
            // await nextTick()
        }
    }catch(e){
        console.log('e', e)
    }
})
function appendProp() {}
function createChildNode(node, data) {
    console.log('data', node, data)
    curNode.value.node = node
    curNode.value.data = data
    tmpConfig.value = {
        parentKey: '',
        key: '',
        label: '',
        data: {
            attrs: {
                'id': ''
            },
            text: ''
        },
        children: []
    }
    tmpConfig.value.parentKey = data.key
    createVisible.value = true
}
function append(data) {
    console.log('tmpConfig', tmpConfig.value)
    console.log('newNodeType', newNodeType.value)
    // const newChild = { label: 'testtest', children: [] }
    if (!curNode.value.data.children) {
        curNode.value.data['children'] = []
    }
    curNode.value.data.children.push(tmpConfig.value)
    console.log('vnodeTree.value', vnodeTree.value)
    createVisible.value = false
}
function remove(node, data) {
    const parent = node.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex(d => d.id === data.id)
    children.splice(index, 1)
}
function generateCode() {
    console.log('vnodeTree.value', vnodeTree.value)
    generatedCode.value = { "template": "", "script": "", "style": "" }
    // generatedCode.value.template = insertTemplate(generatedCode.value.template, [...vnodeTree.value])
    // let tmpNode = h(vnode.label,vnode.data,vnode.children)
    let tmpDom = insertTemplate(generatedCode.value.template, vnodeTree.value)
    let tmpScript = insertScript(generatedCode.value.script, vnodeTree.value)
    generatedCode.value.template = tmpDom
    generatedCode.value.script = tmpScript
    this.$refs.preview.innerHTML = tmpDom
    console.log('tmpNode', this.$refs.preview, tmpDom)
    // this.$refs.preview= generatedCode.value.template
}
function generateVNode() {
    console.log('vnodeTree.value', vnodeTree.value)
}
function changeOptions(data) {
    console.log('data', data)
}
function cancelChange() {
    // tmpConfig.value = 
}

</script>

<style></style>
