<template>
    <div class="container" style="width: 100%">
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
                                    <el-button  type='primary' size="mini" @click.stop="editNode(node,data)" link>
                                        编辑
                                    </el-button>
                                    <el-button type='primary' size="mini" :disabled="!data.couldHaveChild" @click.stop="createChildNode(node,data)" link>
                                        新增子节点
                                    </el-button>
                                    <el-button type='primary' size="mini" @click="() => remove(node, data)" link>
                                        删除
                                    </el-button>
                                </span>
                            </span>
                        </template>
                    </el-tree>
                </el-main>
            </el-container>
        </div>
        <div style="width:40%;">
            <el-container>
                <el-header>节点配置</el-header>
                <el-main v-if="curNodeConfig != null">
                    <el-form ref="curNodeConfigRef" :model="curNodeConfig" label-width="150px">
                            <el-form-item prop="label" label="组件类型">
                                <el-select v-model="curNodeConfig.label" clearable>
                                    <el-option v-for="item in availableComponentsList" :key="item" :label="item"
                                        :value="item"></el-option>
                                </el-select>
                            </el-form-item>
                            <el-form-item v-for="key in Object.keys(curNodeConfig.data.attrs)" :key="key" :label="key">
                                <el-input v-model="curNodeConfig.data.attrs[key]" clearable></el-input>
                            </el-form-item>
                            <div style="float:right">
                                <el-button @click="cancelChange">取 消</el-button>
                                <el-button type="primary" @click="changeNodeConfig(curNodeConfig)">确 定</el-button>
                            </div>
                    </el-form>
                </el-main>
            </el-container>
        </div>
        <div style="width:30%;">
            <el-container>
                <el-header>生成代码</el-header>
                <el-button @click="generateCode">生成拼接代码</el-button>
                <el-button @click="generateVNode">测试script代码</el-button>
                <el-main>
                    <el-input v-model="generatedCode.template" type="textarea" size="small" :autosize="{minRows: 5, maxRows: 25}"></el-input>
                    <el-input v-model="generatedCode.script" type="textarea" size="small" :autosize="{minRows: 5, maxRows: 25}"></el-input>
                    {{  }}
                    <hr />
                    <p>预览</p>
                    <div ref="preview">
                        <div id="container" class="container"></div>
                    </div>
                </el-main>
            </el-container>
        </div>
        <el-dialog class="create-dialog" v-model="createVisible" @closed="closeCreateChildNode" header="创建" width="35%">
            <el-form ref="createDialogRef" :model="tmpConfig" label-width="150px">
                <el-form-item prop="label" label="节点名">
                    <el-select v-model="newNodeType" clearable>
                        <el-option v-for="item in availableComponentsList" :key="item" :label="item"
                            :value="item"></el-option>
                    </el-select>
                </el-form-item>
                <template v-if="newNodeType">
                    <div>
                        <hr>
                        <!-- <header>属性</header> -->
                        <el-form-item v-for="key in Object.keys(tmpConfig.data.attrs)" :key="key" :label="key">
                            <el-input v-model="tmpConfig.data.attrs[key]" clearable></el-input>
                        </el-form-item>
                    </div>
                    <div v-if="tmpConfig.data.hasOwnProperty('text')">
                        <hr>
                        <!-- <header v-if="tmpConfig.data.hasOwnProperty('text')">内容</header> -->
                            <el-input v-model="tmpConfig.data.text" class="dom-text" clearable></el-input>
                    </div>
                </template>
                <el-button @click.prevent="appendProp(domain)"><i
                        class="el-icon-circle-plus-outline"></i>新增属性</el-button>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="closeCreateChildNode">取 消</el-button>
                    <el-button type="primary" @click="() => appendChildNode()">确 定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup>
import componentsConfigMap from '@/materials/componentsConfig.js'
import vueRules, {ruleRegStart} from '@/materials/matchingRules.js'
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
    const createDialogRef = ref(null)
    const newNodeType = ref(undefined)
    //新建节点的父节点
    const parentNode = ref({
        node: {},
        data: {},
    })
    // 节点配置临时数据
    let tmpConfig = ref({
        parentKey: '',
        key: '',
        label: '',
        data: {
            attrs: {},
            text: ''
        },
        children: []
    })
    // 编辑的curNode是当前节点
    let curNode = ref({})
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
        'couldHaveChild': true,
        'children': []
    }])
    const curNodeConfig = ref(vnodeTree.value[0])
    // 生成的代码
    let generatedCode = ref({
        template: '',
        script: '',
        style: ''
    })
    // 控制新建节点弹窗
    let createVisible = ref(false)
    const legalVariableReg = /^[$A-Z_][0-9A-Z_$]*$/i

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
        // console.log('parent: ', parent);
        // console.log('key: ', key);
        // // console.log('text: ', text);
        // console.log('tag: ', tag);
        // console.log('data: ', data);
        // console.log('children', children, childrenTemplate)
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
function insertScript(vNodes = [], scriptData = {}, scriptFunc = []) {
    if (!vNodes.length) return
    for (let cfg of vNodes) {
        const { children, data } = cfg
        if (children && children.length) insertScript(children, scriptData, scriptFunc)
        for (let k in data.attrs) {
            //如果k符合pattern,则将value加入script的data{}中,
            vueRules.attrs.forEach( r => {
                // console.log('r', r)
                console.log('ruleReg(r)',ruleRegStart(r))
                if(k.match(ruleRegStart(r))) {
                    if(!scriptData[data.attrs[k]]) {
                        if(legalVariableReg.test(data.attrs[k])){
                            scriptData[data.attrs[k]] = null
                        }
                    }
                }
            }
        )
            // console.log('k,v', k, data.attrs[k])
            // if(['text'].includes(k)) continue
            // let attrStr =  ` ${k}="${JSON.parse(JSON.stringify(data.attrs[k]))}"`
            // if(data.attrs[k]) {
            //     labelStart = labelStart.insertSubstr(-2, attrStr)
            // }
        }
    }
}
function generateScript(vNodes = [], script = '', scriptData = {}, scriptFunc = []) {
    if (!vNodes.length) return
    if(!script) script = 'export default {\n}'
    insertScript(vNodes, scriptData, scriptFunc)
    let dataStr = generateDataOfScript(scriptData)
    // let FuncStr
    script = script.insertSubstr(-2, dataStr+'\n')
    console.log(script)
    return script
}
function generateDataOfScript(data) {
    let dataStr = JSON.parse(JSON.stringify(data))
    console.log('data', data, dataStr)
    let res = `data() {\n\treturn {\n}}`
    for(let k in dataStr) {
        res = res.insertSubstr(-3,`\t${k}: ${dataStr[k]}\n`)
    }
    return res
}
function insertVnode(tree, node, parentKey) {
}
let availableComponentsList = computed(() => {
    // console.log('this.componentsConfigMap: ', componentsConfigMap);
    return Object.keys(componentsConfigMap)
})
function editNode(node,data) {
    curNode.value = node
    curNodeConfig.value= JSON.parse(JSON.stringify(data))
    console.log('curNodeConfig.value,data', curNode.value.data, curNodeConfig.value)
}
watch(newNodeType, (nv,ov) => {
    try{
        console.log('nv,ov', nv,ov)
        if(nv) {
            let vnode = JSON.parse(JSON.stringify(componentsConfigMap[newNodeType.value]))
            console.log('vnode: ', vnode, newNodeType.value);
            tmpConfig.value = vnode
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
    parentNode.value.node = node
    parentNode.value.data = data
    tmpConfig.value = {
        parentKey: '',
        key: '',
        label: '',
        data: {
            attrs: {},
            text: ''
        },
        children: []
    }
    tmpConfig.value.parentKey = data.key
    createVisible.value = true
}
function closeCreateChildNode() {
    createVisible.value = false
    newNodeType.value = ''
    createDialogRef.value.resetFields()
}
function appendChildNode(data) {
    console.log('tmpConfig', tmpConfig.value)
    console.log('newNodeType', newNodeType.value)
    if (!parentNode.value.data.children) {
        parentNode.value.data['children'] = []
    }
    parentNode.value.data.children.push(JSON.parse(JSON.stringify(tmpConfig.value)))
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
    generatedCode.value.template = tmpDom
    generatedCode.value.script = generateScript(vnodeTree.value,generatedCode.value.script)
    // this.$refs.preview.innerHTML = tmpDom
    // console.log('tmpNode', this.$refs.preview, tmpDom)
    // this.$refs.preview= generatedCode.value.template
}
function generateVNode() {
    // console.log('vnodeTree.value', vnodeTree.value)
    generatedCode.value = { "template": "", "script": "", "style": "" }
    let tmpScript = generateScript(vnodeTree.value, generatedCode.value.script)
    console.log('tmpScript', tmpScript)
}
function changeNodeConfig(data) {
    const parent = curNode.value.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex(d => d.id === data.id)
    parentNode.value.data.children[index] = JSON.parse(JSON.stringify(data))
}
function cancelChange() {
    curNodeConfig.value= JSON.parse(JSON.stringify(curNode.value.data))
}

</script>

<style lang="scss" scoped>
hr{
    width: 90%;
    height:1px;
    margin: 10px auto;
    border: 0;
    margin-right:0;
    background-image: linear-gradient(to right, rgba(0,0,0,0),rgba(0,0,0,0.2),rgba(0,0,0,0.4));
}
.dom-text::before {
    content:"innerText";
    width:150px;
    text-align:right;
    padding-right: 10px;
}
</style>
