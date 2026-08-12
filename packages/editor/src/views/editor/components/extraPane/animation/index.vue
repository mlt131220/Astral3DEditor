<template>
  <div class="extra-pane-item">
    <div class="extra-pane-item-header">
      <span></span>
      <n-button-group size="tiny">
        <!-- 跳转至开始 -->
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button ghost @click="animationStore.jumpToStart()">
              <template #icon>
                <n-icon>
                  <SkipBackFilled/>
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ t("extra.Jump to first frame") }}
        </n-tooltip>

        <!-- 播放 -->
        <n-tooltip trigger="hover" v-if="!animationStore.current?.isRunning">
          <template #trigger>
            <n-button ghost @click="animationStore.play">
              <template #icon>
                <n-icon>
                  <PlayFilledAlt/>
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ t("layout.sider.animation.Play") }}
        </n-tooltip>

        <template v-else>
          <!-- 暂停 -->
          <n-tooltip trigger="hover" v-if="!animationStore.current?.isPaused">
            <template #trigger>
              <n-button ghost @click="animationStore.pause">
                <template #icon>
                  <n-icon>
                    <PauseFilled/>
                  </n-icon>
                </template>
              </n-button>
            </template>
            {{ t("layout.sider.animation.Pause") }}
          </n-tooltip>

          <!-- 继续 -->
          <n-tooltip trigger="hover" v-else>
            <template #trigger>
              <n-button ghost @click="animationStore.pause">
                <template #icon>
                  <n-icon>
                    <ContinueFilled/>
                  </n-icon>
                </template>
              </n-button>
            </template>
            {{ t("layout.sider.animation.Continue") }}
          </n-tooltip>

          <!-- 停止 -->
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button ghost @click="animationStore.stop">
                <template #icon>
                  <n-icon>
                    <StopFilledAlt/>
                  </n-icon>
                </template>
              </n-button>
            </template>
            {{ t("layout.sider.animation.Stop") }}
          </n-tooltip>
        </template>

        <!-- 跳转至结束 -->
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button @click="animationStore.jumpToEnd()">
              <template #icon>
                <n-icon>
                  <SkipForwardFilled/>
                </n-icon>
              </template>
            </n-button>
          </template>
          {{ t("extra.Jump to last frame") }}
        </n-tooltip>
      </n-button-group>

      <div class="flex">
        <n-text type="success"> {{ animationStore.getFormattedCurrentTime }}</n-text>
        <span>&nbsp;/&nbsp;</span>
        <n-text> {{ animationStore.getFormattedDuration }}</n-text>
      </div>
    </div>

    <div class="extra-pane-item-content">
      <Animation v-show="isSelectObject3D" :isSelectObject3D="isSelectObject3D"/>

      <n-result v-show="!isSelectObject3D" status="418" title="Empty" class="h-full flex-center flex-col"
                :description="t('prompt[\'No object selected.\']')"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount} from 'vue';
import {
  SkipBackFilled,
  PlayFilledAlt,
  PauseFilled,
  ContinueFilled,
  StopFilledAlt,
  SkipForwardFilled
} from '@vicons/carbon';
import {t} from "@/language";
import {App,Hooks,Timeline} from '@astral3d/engine';
import {useAnimationStore} from "@/store/modules/animation";
import Animation from './Animation.vue';

const animationStore = useAnimationStore();

const isSelectObject3D = ref(false);

function objectSelected(object) {
  isSelectObject3D.value = !!object;
}

/**
 * 在场景结构变更后同步当前对象的实时名称。
 * @returns 无返回值。
 */
function sceneGraphChanged() {
  const animationRoot = animationStore.current
      ? App.animationManager.actionMap.get(animationStore.current.uuid)?.getRoot()
      : undefined;
  if (!animationRoot) return;

  animationRoot.traverse(object => animationStore.updateObjectName(object));
}

// 动画轨道时间变化(游标拖动)
function timelineTimeChanged(args: Timeline.TimelineTimeChangedEvent) {
  animationStore.currentTime = args.val;
}

//  动画轨道行变化（添加/删除）
function timelineRowChanged() {
  // 刷新树和轨道行
  animationStore.setCurrent(animationStore.current);
}

onMounted(() => {
  isSelectObject3D.value = !!App.selected;
  Hooks.useAddSignal("objectSelected", objectSelected);
  Hooks.useAddSignal("sceneGraphChanged", sceneGraphChanged);
  Hooks.useAddSignal("timelineTimeChanged", timelineTimeChanged);
  Hooks.useAddSignal("timelineRowChanged", timelineRowChanged);
})
onBeforeUnmount(() => {
  Hooks.useRemoveSignal("objectSelected", objectSelected);
  Hooks.useRemoveSignal("sceneGraphChanged", sceneGraphChanged);
  Hooks.useRemoveSignal("timelineTimeChanged", timelineTimeChanged);
  Hooks.useRemoveSignal("timelineRowChanged", timelineRowChanged);
})
</script>

<style lang="less" scoped>
.extra-pane-item-header {
  padding-left: 0;
  justify-content: space-between !important;
}

.extra-pane-item-content {
  overflow-y: hidden;
}
</style>
