<template>
  <div id="assets-library-cameras">
    <n-alert type="info" :bordered="false" closable class="mb-2 mx-2">
      {{ t("prompt['Drag or double click to add to scene']") }}
    </n-alert>

    <div class="cards">
      <n-card size="small" hoverable v-for="item in cameras" :key="item.key" @dblclick="addToScene(item.key)"
              draggable="true"
              @dragstart="dragStart($event,item.key)"
              @dragend="dragEnd">
        <template #cover>
          <n-icon size="50" class="ml-10px mr-5px">
            <component :is="item.icon" />
          </n-icon>
        </template>
        <n-tooltip placement="bottom" trigger="hover">
          <template #trigger> {{ item.name.value }}</template>
          <span> {{ item.name.value }} </span>
        </n-tooltip>
      </n-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Carbon3DMprToggle,CenterToFit } from '@vicons/carbon';
import {BasicObject3D} from "@/core/objects/basicObject3D";
import {t,cpt} from "@/language";
import {useDragStore} from "@/store/modules/drag";
import {screenToWorld} from "@/utils/common/scenes";
import {NIcon} from "naive-ui";

const cameras = [//配图使用平行光灯光颜色 rgb(35,49,221)
  {key:"orthographicCamera",icon:CenterToFit,name:cpt("layout.header.OrthographicCamera")},
  {key:"perspectiveCamera",icon:Carbon3DMprToggle,name:cpt("layout.header.PerspectiveCamera")}
]

let basicObject3D  = new BasicObject3D();

//双击添加至场景
function addToScene(key){
  basicObject3D.init(key);
}

// 开始拖拽事件
const dragStore = useDragStore();

function dragStart(e,key){
  dragStore.setData(key)
}

function dragEnd(){
  if(dragStore.getActionTarget !== "addToScene" || dragStore.endArea !== "Scene") return;

  const position = screenToWorld(dragStore.endPosition.x,dragStore.endPosition.y);
  basicObject3D.init(dragStore.getData, {position:position});
  dragStore.setActionTarget("");
}
</script>

<style scoped lang="less">
#assets-library-cameras{
  overflow-x: hidden;

  .cards{
    padding: 0 10px 10px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-gap: 10px 8px;
  }

  .n-card{
    //height:max-content;
    cursor:pointer;

    .n-image {
      display: block;
    }

    :deep(.n-card-cover) {
      height: 85px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :deep(.n-card__content){
      padding: 3px 0;
      font-size: 13px;
      text-align: center;
    }
  }
}
</style>
