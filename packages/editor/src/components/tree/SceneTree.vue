<script lang="ts" setup>
import {h, ref, onMounted, nextTick, onBeforeUnmount} from "vue";
import {TreeOption, TreeDropInfo, NIcon, NBadge, NEllipsis} from "naive-ui";
import {
  Camera,
  Schematics,
  Cube,
  ModelAlt,
  HeatMap,
  Folder,
  Light,
  Soccer,
  Draw,
  FloatingIp,
  Network1,
  Image,
  LocationHeart,
  LocationCompany
} from '@vicons/carbon';
import {t} from "@/language";
import {App,Hooks, MoveObjectCommand, RemoveObjectCommand, AddObjectCommand} from "@astral3d/engine";
import {escapeHTML, findSiblingsAndIndex} from "@/utils/common/utils";
import {getMaterialName} from "@/utils/common/scenes";
import EsContextmenu from "@/components/es/EsContextmenu.vue";

const sceneTreeRef = ref();
const pattern = ref("");
const sceneTreeData = ref<TreeOption[]>([
  {
    label: window.$cpt("core.editor['Default Camera']"),
    key: 0,
    isLeaf: true,
    disabled: false,
    prefix: getPrefixIcon("PerspectiveCamera"),
  },
  {
    label: window.$cpt("core.editor['Default Scene']"),
    key: 1,
    isLeaf: true,
    disabled: false,
    prefix: getPrefixIcon("Scene"),
  }
]);
const sceneTreeSelected = ref<Array<string | number>>([]);
const sceneTreeExpandedKeys = ref<number[]>([]);

function objectSelected(object) {
  if (object !== null && object.parent !== null) {
    sceneTreeSelected.value = [object.id];
    // 将此id父级递归展开
    sceneTreeExpandedKeys.value = [App.scene.id];

    function getParentId(obj) {
      if (obj.parent.id !== App.scene.id) {
        sceneTreeExpandedKeys.value.push(obj.parent.id);
        getParentId(obj.parent);
      }
    }

    getParentId(object)

    //在虚拟滚动模式下滚动到某个节点
    sceneTreeRef.value?.scrollTo({key: object.id})
  } else {
    sceneTreeSelected.value = [];
  }
}

// 更新树
function refreshUI() {
  const camera = App.camera;
  const scene = App.scene;

  const _sceneTreeData: any = [];
  _sceneTreeData.push({
    label: window.$cpt("core.editor['Default Camera']"),
    key: camera.id,
    isLeaf: true,
    disabled: (App.locked && App.locked.uuid !== camera.uuid),
    prefix: getPrefixIcon(camera.type),
  });

  const sceneDisabled = (App.locked && App.locked.uuid !== scene.uuid) as boolean;
  _sceneTreeData.push({
    label: window.$cpt("core.editor['Default Scene']"),
    key: scene.id,
    isLeaf: false,
    disabled: sceneDisabled,
    prefix: getPrefixIcon(scene.type),
    // children: App.locked ? (function (){
    //   if([scene.uuid,camera.uuid].includes(App.locked.uuid)){
    //     return [];
    //   }else {
    //     return [getTreeData(App.locked)];
    //   }
    // })() : addObjects(scene)
    children: addObjects(scene, sceneDisabled)
  });

  if (sceneTreeExpandedKeys.value.length === 0) {
    sceneTreeExpandedKeys.value = [scene.id];
  }

  function getTreeData(object3D, disabled = true) {
    const data: TreeOption = {
      label: escapeHTML(object3D.name),
      key: object3D.id,
      isLeaf: object3D.children.length === 0,
      disabled: App.locked ? disabled : false,
      prefix: getPrefixIcon(object3D.type),
    }
    if (!data.isLeaf) {
      data.children = addObjects(object3D, disabled);
    }

    if (object3D.isMesh) {
      const geometry = object3D.geometry;
      const material = object3D.material;

      data.suffix = () => {
        return h('div', {class: "ml-4 text-12px"}, [
          h(
              NBadge,
              {dot: true, type: 'success'},
              {},
          ),
          h(NEllipsis, {class: "!max-w-100px"}, {
            default: () => h("span", {class: 'ml-1 mr-2'}, {default: () => escapeHTML(geometry.name)})
          }),
          h(
              NBadge,
              {dot: true, type: 'warning'},
              {},
          ),
          h(NEllipsis, {class: "!max-w-100px"}, {
            default: () => h("span", {class: 'ml-1 mr-2'}, {default: () => escapeHTML(getMaterialName(material))})
          }),

        ])
      }
    }

    return data;
  }

  function addObjects(object3D, disabled = true) {
    const childArr: TreeOption[] = [];

    if (object3D.ignore) return childArr;

    //for循环 为大场景提升遍历效率
    for (let i = 0, l = object3D.children.length; i < l; i++) {
      let _disabled = disabled;

      const child = object3D.children[i];

      if (child.ignore) continue;

      if (_disabled) {
        _disabled = (App.locked && App.locked.uuid !== child.uuid) as boolean;
      }

      childArr.push(getTreeData(child, _disabled));
    }

    return childArr;
  }

  if (App.selected !== null) {
    sceneTreeSelected.value = [App.selected.id];
  }

  sceneTreeData.value = _sceneTreeData;
}

// 获取节点前缀图标
function getPrefixIcon(type: string) {
  const getIconRender = (icon: any) => {
    return h(
        NIcon,
        {size: 16},
        {default: () => h(icon)}
    )
  }

  switch (type) {
    case "PerspectiveCamera":
    case "OrthographicCamera":
      return () => getIconRender(Camera);
    case "Light":
    case "AmbientLight":
    case "DirectionalLight":
    case "HemisphereLight":
    case "PointLight":
    case "SpotLight":
    case "RectAreaLight":
      return () => getIconRender(Light);
    case "Scene":
      return () => getIconRender(Schematics);
    case "Group":
      return () => getIconRender(Folder);
    case "Mesh":
    case "SkinnedMesh":
      return () => getIconRender(Cube);
    case "BatchedMesh":
    case "InstancedMesh":
      return () => getIconRender(ModelAlt);
    case "Line":
    case "LineLoop":
    case "LineSegments":
      return () => getIconRender(Draw);
    case "Points":
      return () => getIconRender(Network1);
    case "Bone":
      return () => getIconRender(FloatingIp);
    case "Skeleton":
      return () => getIconRender(Soccer);
    case 'Sprite':
      return () => getIconRender(Image);
    case "Particle":
      return () => getIconRender(HeatMap);
    case "Billboard":
      return () => getIconRender(LocationHeart);
    case "HtmlPanel":
    case "HtmlSprite":
      return () => getIconRender(LocationCompany);
    default:
      return () => getIconRender(Cube);
  }
}

//移动模型
function moveObject(object, newParent, nextObject) {
  if (nextObject === null) nextObject = undefined;

  let newParentIsChild = false;

  object.traverse(function (child) {
    if (child === newParent) newParentIsChild = true;
  });

  if (newParentIsChild) return;

  App.execute(new MoveObjectCommand(object, newParent, nextObject));
}

/**
 * 处理树节点拖动
 * @param node 拖动到的目标位置节点
 * @param dragNode 被拖动的节点
 * @param dropPosition 拖动到的相对于目标节点的位置
 */
function handleSceneTreeDrop({node, dragNode, dropPosition}: TreeDropInfo) {
  //无法移动到默认场景之外
  if (node.label === window.$t("core.editor['Default Camera']") || node.label === window.$t("core.editor['Default Scene']")) return;
  // 要拖动到的目标模型
  const targetParentObject3D = App.scene.getObjectById(Number(node.key));
  if(!targetParentObject3D) return;
  // 被拖动的模型
  const dragObject3D = App.scene.getObjectById(Number(dragNode.key));

  const [dragNodeSiblings, dragNodeIndex] = findSiblingsAndIndex(dragNode, sceneTreeData.value);
  if (dragNodeSiblings === null || dragNodeIndex === null) return;
  //在被拖动节点的父级中删除该节点
  dragNodeSiblings.splice(dragNodeIndex, 1);

  switch (dropPosition) {
    case "inside":
      if (node.children) {
        node.children.unshift(dragNode)
      } else {
        node.children = [dragNode];
        node.isLeaf = false;
      }
      // 移动模型
      moveObject(dragObject3D, targetParentObject3D, null);
      break;
    case "before":
      // 寻找目标位置节点的父级及该节点的索引
      const [_nodeSiblings, _nodeIndex] = findSiblingsAndIndex(node, sceneTreeData.value);
      if (_nodeSiblings === null || _nodeIndex === null) return;
      _nodeSiblings.splice(_nodeIndex, 0, dragNode);
      // 移动模型
      moveObject(dragObject3D, targetParentObject3D.parent, targetParentObject3D);
      break;
    case "after":
      const [nodeSiblings, nodeIndex] = findSiblingsAndIndex(node, sceneTreeData.value);
      if (nodeSiblings === null || nodeIndex === null) return
      nodeSiblings.splice(nodeIndex + 1, 0, dragNode);
      // 移动模型
      moveObject(dragObject3D, targetParentObject3D.parent, targetParentObject3D.parent?.children[targetParentObject3D.parent?.children.indexOf(targetParentObject3D) + 1]);
      break;
  }

  sceneTreeData.value = Array.from(sceneTreeData.value);
}

// 判断树节点是否可拖动到对应选择位置（拖动到内部时只能是Group / Scene）
function allowDrop({dropPosition, node}) {
  if (dropPosition === "inside") {
    // 要拖动到的目标模型
    const targetParentObject3D = App.scene.getObjectById(Number(node.key));

    if (targetParentObject3D?.type !== "Group" && targetParentObject3D?.type !== "Scene") {
      return false
    }
  }

  return true;
}

//场景树节点选中/取消选中事件
function handlerTreeSelectChange(keys: Array<number>, _: Array<TreeOption>, meta: {
  node: TreeOption,
  action: 'select' | 'unselect'
}) {
  sceneTreeSelected.value = keys;
  if (meta.action === "select") {
    App.selectById(keys[0]);
  } else {
    App.deselect();
  }
}

// 场景树节点点击事件，主要用于配合右键菜单
function nodeProps({option}: { option: TreeOption }) {
  return {
    onContextmenu(e: MouseEvent): void {
      e.preventDefault();
      if ([App.camera.id, App.scene.id].includes(option.key as number)) return;

      contextmenuRef.value?.show(e.clientX, e.clientY);

      contextmenuTreeOption.value = option;
    }
  }
}

/* 右键菜单 */
const contextmenuRef = ref();
const contextmenuOptions = [
  {
    label: t("other.Focus"),
    key: 'focus'
  }
];
const contextmenuTreeOption = ref<TreeOption | null>(null);

function handleContextmenuSelect(key: string) {
  if (!contextmenuTreeOption) return;

  const object = App.scene.getObjectById(contextmenuTreeOption.value?.key as number);

  if(!object) return;

  switch (key) {
    case "focus":
      App.focus(object);
      break;
    case "delete":
      const parent = object.parent;
      if (parent !== null) App.execute(new RemoveObjectCommand(object));
      break;
    case "clone":
      const _object = App.cloneObject(object);

      App.execute(new AddObjectCommand(_object));
      break;
  }
}

onMounted(async () => {
  // 此signal必须在nextTick方法前注册，否则会造成viewer中已分发此处却尚未监听
  Hooks.useAddOnceSignal("viewerInitCompleted",(viewer) => {
    if(viewer.edit?.enabled){
      contextmenuOptions.push({
        label: t("home.Delete"),
        key: 'delete'
      },{
        label: t("layout.header.Clone"),
        key: 'clone'
      })
    }
  });

  await nextTick();
  refreshUI();

  Hooks.useAddSignal("sceneCleared", refreshUI);
  Hooks.useAddSignal("sceneTreeChange", refreshUI);
  Hooks.useAddSignal("objectAdded", refreshUI);
  Hooks.useAddSignal("objectRemoved", refreshUI);
  Hooks.useAddSignal("objectSelected", objectSelected);
  Hooks.useAddSignal("objectLocked", refreshUI);
  Hooks.useAddSignal("objectUnlocked", refreshUI);
})

onBeforeUnmount(() => {
  Hooks.useRemoveSignal("sceneCleared", refreshUI);
  Hooks.useRemoveSignal("sceneTreeChange", refreshUI);
  Hooks.useRemoveSignal("objectAdded", refreshUI);
  Hooks.useRemoveSignal("objectRemoved", refreshUI);
  Hooks.useRemoveSignal("objectSelected", objectSelected);
  Hooks.useRemoveSignal("objectLocked", refreshUI);
  Hooks.useRemoveSignal("objectUnlocked", refreshUI);
})
</script>

<template>
  <n-input v-model:value="pattern" :placeholder="t('layout.sider.scene.Search')"/>
  <n-tree ref="sceneTreeRef" virtual-scroll :pattern="pattern" :data="sceneTreeData" v-model:selected-keys="sceneTreeSelected"
          :show-irrelevant-nodes="false" v-model:expanded-keys="sceneTreeExpandedKeys" draggable :allow-drop="allowDrop"
          :node-props="nodeProps" @drop="handleSceneTreeDrop" @update:selected-keys="handlerTreeSelectChange" block-line
  />

  <EsContextmenu ref="contextmenuRef" placement="right-start" trigger="manual" size="small"
                 :options="contextmenuOptions" @select="handleContextmenuSelect"/>
</template>

<style lang="less" scoped>
.n-input {
  margin-bottom: 10px;
  height: 34px;
}

.n-tree {
  height: calc(100% - 44px);
  width: 100%;
  overflow-x: auto;

  :deep(.n-tree-node-wrapper) {
    white-space: nowrap;
  }

  :deep(.n-tree-node-content__text) {
    flex-grow: unset;
  }
}
</style>
