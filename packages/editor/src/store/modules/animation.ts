import {reactive, toRefs, h,computed} from "vue";
import {NIcon} from 'naive-ui';
import type {TreeOption} from 'naive-ui'
import { defineStore } from "pinia";
import type { Object3D } from "three";
import {ConditionPoint} from '@vicons/carbon';
import {store} from '@/store';
import {t} from "@/language";
import type {TimelineTrack,ITimelineRow} from "@astral3d/engine";
import {App} from "@astral3d/engine";

export interface IAnimationItem {
    name: string,
    uuid: string,
    isRunning: boolean,
    isPaused: boolean,
}

interface IAnimationState {
    // 选中模型的动画列表
    list: Array<IAnimationItem>,
    // 动画编辑器当前选中的动画
    current: IAnimationItem | null,
    // 当前选中动画的所有轨道
    trackTree: TreeOption[],
    // 全局的动画播放速率
    mixerTimeScale: number,
    // 当前播放的时间(毫秒)
    currentTime: number,
    // 当前action总时长(毫秒)
    duration: number,
}

// 动画轨道类实例
let timelineInstance: TimelineTrack, waitRows: ITimelineRow[] = [];

/**
 * 模型动画（动画编辑器）
 */
export const useAnimationStore = defineStore('model-animation', () => {
    const state = reactive<IAnimationState>({
        list: [],
        current: null,
        trackTree: [],
        mixerTimeScale: 1.0,
        currentTime: 0,
        duration: 0
    })

    /**
     * getter
     **/
    // 动画时间帧一步的长度，默认一步走过一个像素代表1000ms (即1px代表多少ms)
    const getStepVal = () => {
            if (timelineInstance) {
                return (<number>timelineInstance.timeline._options.stepVal) * timelineInstance.timeline._currentZoom / (<number>timelineInstance.timeline._options.zoom);
            } else {
                return 1000;
            }
        };
    // 获取格式化后的总时长 00:00:00
    const getFormattedDuration = computed(() => {
        const _time = state.duration / 1000;
        const hours = Math.floor(_time / 3600);
        const minutes = Math.floor((_time - hours * 3600) / 60);
        const seconds = _time - hours * 3600 - minutes * 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toFixed(0).padStart(2, "0")}`;
    });
    // 获取格式化后的播放时间 00:00:00
    const getFormattedCurrentTime = computed(() => {
        const _time = state.currentTime / 1000;
        const hours = Math.floor(_time / 3600);
        const minutes = Math.floor((_time - hours * 3600) / 60);
        const seconds = (_time- hours * 3600 - minutes * 60).toFixed(0);
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.padStart(2, "0")}`;
    });

    /**
     * actions
     **/
    const setTimelineInstance = (instance: TimelineTrack) => {
        timelineInstance = instance;

        if (waitRows.length) {
            timelineInstance.setRows(waitRows);
            waitRows = [];

            const action = App.animationManager.actionMap.get(state.current?.uuid as string);
            if (!action) return;
            timelineInstance.bindAction = action;
        }
    }
    // 设置动画列表
    const setList = (_list: Array<IAnimationItem>, _current: IAnimationItem | null = null) => {
        state.list = _list;
        if (_current) {
            setCurrent(_current);
        } else {
            setCurrent(_list.length ? _list[0] : null);
        }
    }
    // 设置当前选中的动画(会刷新树列表及动画轨道)
    const setCurrent = (value: IAnimationItem | null) => {
        state.current = value;

        if (!value) {
            state.trackTree = [];
            state.currentTime = 0;
            state.duration = 0;

            if (timelineInstance) {
                timelineInstance.setRows([]);
                timelineInstance.bindAction = null;
                waitRows = [];
            }
            return;
        }

        // 取出当前动画下的所有轨道组织rows关系
        const action = App.animationManager.actionMap.get(value.uuid);
        if (!action) return;

        const actionClip = action.getClip();
        const actionObject = action.getRoot();
        state.duration = actionClip.duration * 1000;

        // 取出所有轨道并按名称排序
        const tracks = [...actionClip.tracks].sort((a, b) => a.name.localeCompare(b.name));

        const _trackTree: TreeOption = {
            key: actionObject.uuid,
            label: actionObject.name,
            children: [],
            isLeaf: false
        };
        waitRows = [{
            id: actionObject.uuid,
            name: actionObject.name
        }];
        const pathMap = new Map(); // 用于记录已有路径
        // 处理每个轨道
        tracks.forEach(track => {
            const parts = track.name.split('.');
            let currentPath = '';
            let parentNode: TreeOption | null = null;

            parts.forEach((part, index) => {
                const isLeaf = index === parts.length - 1;
                const nodePath = currentPath ? `${currentPath}!!${part}` : part;

                if (index === 0 && (part === actionObject.name || part === actionObject.uuid)) return;

                // 如果节点已存在则直接使用
                if (pathMap.has(nodePath)) {
                    parentNode = pathMap.get(nodePath);
                    currentPath = nodePath;
                    return;
                }

                // UUID 只负责稳定绑定，树节点始终展示对象的当前名称。
                const trackObject = index === 0 ? actionObject.getObjectByProperty('uuid', part) : undefined;
                const displayName = trackObject ? trackObject.name : part;

                // 记录到rows
                const _row: ITimelineRow = {
                    id: nodePath,
                    name: displayName
                }

                // 创建新节点
                const newNode: TreeOption = {
                    key: nodePath,
                    label: displayName,
                    children: [],
                    ...(isLeaf && {
                        isLeaf: true,
                        suffix: () =>
                            h(
                                NIcon,
                                {
                                    size: 16,
                                    onClick: () => {
                                        // 取最后一段（如 'nodeName.property[accessor]'）
                                        const lastSegment = parts[parts.length - 1];
                                        // 再按 '[' 分割，取第一部分（如 'property'）
                                        let attr = lastSegment?.split('[')[0];
                                        // 如果parts倒数第二个元素为material,则添加至前面
                                        if(parts.length > 1 && parts[parts.length - 2] ==='material'){
                                            attr = `material.${attr}`;
                                        }
                                        addKeyframe(attr);
                                    }
                                },
                                {default: () => h(ConditionPoint)}
                            ),
                    })
                };

                // 如果是叶子节点，则写入关键帧值
                if (isLeaf) {
                    _row.keyframes = [];
                    // 每个关键帧的值的长度
                    const dataLength = Math.floor(track.values.length / track.times.length);
                    track.times.forEach((time, i) => {
                        _row.keyframes?.push({
                            val: time * 1000,
                            // @ts-ignore
                            data: track.values.slice(i * dataLength, (i + 1) * dataLength)
                        })
                    })
                    _row.track = track;
                }
                waitRows.push(_row);

                // 挂载到父节点或根
                if (parentNode) {
                    parentNode.children?.push(newNode);
                } else {
                    _trackTree.children?.push(newNode);
                }

                // 更新路径记录
                pathMap.set(nodePath, newNode);
                parentNode = newNode;
                currentPath = nodePath;
            });
        });

        state.trackTree = [_trackTree];
        if (timelineInstance) {
            timelineInstance.setRows(waitRows);
            timelineInstance.bindAction = action;
            waitRows = [];

            state.duration = timelineInstance._maxDuration;
        }
    }
    /**
     * 按 UUID 同步动画轨道树中的对象显示名称，不重建时间轴
     * @param object 已发生变更的场景对象
     * @returns 无返回值
     */
    const updateObjectName = (object: Object3D) => {
        const rootNode = state.trackTree[0];
        if (!rootNode) return;

        let targetNode: TreeOption | undefined;
        /**
         * 在当前轨道树中递归查找对象节点
         * @param node 当前树节点
         * @returns 无返回值
         */
        const findNodeByUuid = (node: TreeOption) => {
            if (node.key === object.uuid) {
                targetNode = node;
                return;
            }

            node.children?.some(child => {
                findNodeByUuid(child);
                return !!targetNode;
            });
        };
        findNodeByUuid(rootNode);
        if (!targetNode) return;

        if (targetNode.label !== object.name) targetNode.label = object.name;

        const rows = timelineInstance ? timelineInstance.model.rows : waitRows;
        const row = rows.find(item => item.id === object.uuid);
        if (row && row.name !== object.name) {
            row.name = object.name;
            timelineInstance?.timeline.redraw();
        }
    }
    const play = () => {
        if (!state.current) return;

        if (timelineInstance) {
            timelineInstance.play();
        } else {
            const action = App.animationManager.actionMap.get(state.current.uuid);
            if (!action) return;

            action.play();
            action.paused = false;
        }

        state.current.isPaused = false;
        state.current.isRunning = true;
    }
    const pause = () => {
        if (!state.current) return;

        if (timelineInstance) {
            timelineInstance.pause();
        } else {
            const action = App.animationManager.actionMap.get(state.current.uuid);
            if (!action) return;

            action.paused = !state.current.isPaused;
        }

        state.current.isPaused = !state.current.isPaused;
    }
    const stop = () => {
        if (!state.current) return;

        if (timelineInstance) {
            timelineInstance.stop();
        } else {
            const action = App.animationManager.actionMap.get(state.current.uuid);
            if (!action) return;

            action.stop();
        }
        state.current.isPaused = false;
        state.current.isRunning = false;
    }
    // 跳转至开始
    const jumpToStart = () => {
        if (!timelineInstance) return;

        timelineInstance.timeline.setTime(0);
    }
    // 跳转至最后
    const jumpToEnd = () => {
        if (!timelineInstance) return;

        timelineInstance.timeline.setTime(state.duration);
    }
    // 添加关键帧
    const addKeyframe = (attr: string) => {
        if (!state.current) {
            window.$message?.error(t("prompt.Please select an animation"));
            return;
        }

        if (state.current.isRunning) {
            window.$message?.error(t("prompt['The animation is running, please stop the animation before performing operations']"));
            return;
        }

        if (timelineInstance) {
            timelineInstance.addKeyframe(attr);

            state.duration = timelineInstance._maxDuration;
        }
    }
    // 设置动画播放时间(单位：ms)
    const setPlayTime = (time: number) => {
        if (timelineInstance) {
            timelineInstance.timeline.setTime(time);
        }
    };

    return {
        ...toRefs(state),
        getStepVal,
        getFormattedDuration,
        getFormattedCurrentTime,
        setTimelineInstance,
        setList,
        setCurrent,
        updateObjectName,
        play,
        pause,
        stop,
        jumpToStart,
        jumpToEnd,
        addKeyframe,
        setPlayTime
    }
});

// setup 之外使用
export function useAnimationStoreWithOut() {
    return useAnimationStore(store);
}
