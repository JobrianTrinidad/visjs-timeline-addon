/*-
 * #%L
 * Timeline
 * %%
 * Copyright (C) 2021 Vaadin Ltd
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */
import Arrow from "./arrow.js";
import moment from "moment";

import {DataSet, Timeline,} from "vis-timeline/standalone/umd/vis-timeline-graph2d.js";

window.vcftimeline = {
    create: function (container, itemsJson, optionsJson) {
        setTimeout(() => this._createTimeline(container, itemsJson, null, optionsJson));
    },

    createGroups: function (container, itemsJson, groupJson, optionsJson) {
        setTimeout(() => this._createTimeline(container, itemsJson, groupJson, optionsJson));
    },

    _createTimeline: function (container, itemsJson, groupsJson, optionsJson) {
        // parsed items
        let parsedItems = JSON.parse(itemsJson);
        let items;
        let groupItems = new DataSet();
        let bGroup = false;
        if (groupsJson != null) bGroup = true;
        if (bGroup) {
            let parsedGroupItems = JSON.parse(groupsJson);
            for (let i = 0; i < parsedGroupItems.length; i++) {
                let nestedGroups = [];
                let groupsNested = [];
                try {
                    nestedGroups = parsedGroupItems[i].nestedGroups.split(",");

                    for (let j = 0; j < nestedGroups.length; j++) {
                        groupsNested[j] = Number.parseInt(nestedGroups[j]);
                    }
                } catch (e) {
                    groupsNested = null;
                }

                groupItems.add({
                    id: Number.parseInt(parsedGroupItems[i].groupId),
                    content: parsedGroupItems[i].content,
                    treeLevel: parsedGroupItems[i].treeLevel,
                    nestedGroups: groupsNested,
                    visible: parsedGroupItems[i].visible,
                    className: parsedGroupItems[i].className,
                });
            }
            items = new DataSet();
            // let types = ["box", "point", "range", "background"];
            for (let i = 0; i < parsedItems.length; i++) {
                let type = 0;

                let s = '';
                if (parsedItems[i].style != null) {
                    s = parsedItems[i].style;
                }
                items.add({
                    id: parsedItems[i].id,
                    group: parsedItems[i].group,
                    content: parsedItems[i].content,
                    start: parsedItems[i].start,
                    end: parsedItems[i].end,
                    title: parsedItems[i].title,
                    editable: {
                        add: true,
                        updateTime: parsedItems[i].editable && parsedItems[i].editable.updateTime !== undefined ? parsedItems[i].editable.updateTime : true,
                        updateGroup: true,
                        remove: parsedItems[i].editable && parsedItems[i].editable.remove !== undefined ? parsedItems[i].editable.remove : true,
                    },
                    selectable: true,
                    style: s,
                    type: type,
                    className: parsedItems[i].className,
                });
            }

        } else items = new DataSet(parsedItems);
        // // Get options for timeline configuration
        let options = this._processOptions(container, optionsJson);
        // Create Timeline
        let timeline;
        if (bGroup) {
            timeline = new Timeline(container, items, groupItems, options);
        } else timeline = new Timeline(container, items, options);

        container.timeline = new Arrow(timeline, bGroup);

        // Save the original toggleGroupShowNested function
        container.timeline._timeline.itemSet._originalToggleGroupShowNested = container.timeline._timeline.itemSet.toggleGroupShowNested;
        // Define your custom toggleGroupShowNested function
        function customToggleGroupShowNested(group) {
//          console.log("Custom validation for group:", group);
          if(group.isShowHideCall)
          {
            group.isShowHideCall = false;
            return;
          }
          // Call the original toggleGroupShowNested function
          container.timeline._timeline.itemSet._originalToggleGroupShowNested(group);
        }
        // Overwrite the existing _onGroupClick function
        container.timeline._timeline.itemSet.toggleGroupShowNested = customToggleGroupShowNested.bind(container.timeline._timeline.itemSet);

        let group = null;
        let selectedItems = [];

        container.timeline._timeline.on("select", (properties) => {
            if (!properties.items || properties.items.length === 0)
                return;

            let clickedGroup = container.timeline._timeline.itemSet.groupFromTarget(properties.event);
            if (clickedGroup) {
                selectedItems = properties.items;
                let allGroups = groupItems.get();
                for (let group of allGroups) {
                        //remove all tags but preserve assign class
                        var groupClass = (group.className === null || group.className === '') ? "" : group.className.replace("vis-group-unselected", "");
                        groupClass = groupClass.replace("vis-group-selected", "");
                    if (group.id !== clickedGroup.groupId) {
                        groupClass+= " vis-group-unselected";
                        group.className = groupClass;
                        groupItems.update(group);
                    } else {
                        groupClass += " vis-group-selected";
                        group.className = groupClass;
                        groupItems.update(group);
                    }
                }
            }

            let temp = properties.items.toString();
            container.$server.onSelect(temp.replace(" ", ""));
        });

        container.timeline._timeline.on('doubleClick', function (properties) {
            if (properties.firstTarget && properties.firstTarget.tagName === 'BUTTON') {
              return;
            }
            if (properties.what === 'item') {
                let itemData = container.timeline._timeline.itemsData.get(properties.item);
                itemData.content = '<input>' + itemData.content;
                container.timeline._timeline.itemsData.remove(itemData.id);
                itemData.editing = true;
                container.timeline._timeline.itemsData.add(itemData);
            }
        });

        container.timeline._timeline.itemSet.groupHammer.on("tap", (properties) => {
             if (properties.firstTarget && properties.firstTarget.tagName === 'BUTTON') {
               return;
             }
            let itemSet = container.timeline._timeline.itemSet;
            let temp = itemSet.groupFromTarget(properties.srcEvent);
            group = itemSet.groupsData.get(temp.groupId);
//            container.$server.onSelectItemInGroup(group.id);
            if (!group.nestedGroups)
                this._updateGroupClassName(container, group, "vis-group-selected");
            else
            {
                for (const nestedGroup of group.nestedGroups) {
                    this._removeGroupsClassName(container, nestedGroup, "vis-group-unselected");
                }
            }
//            console.log("Tap detected", properties);
        });

        var selectedGroup = null;
        // Add a right-click event listener [ itemSet.groupHammer. ]
        container.timeline._timeline.on("contextmenu", (properties) => {
            // Prevent default browser context menu
            properties.event.preventDefault();

            // Check if the event is on a button, if so return
            if (properties && properties.what !== 'group-label') {
                hideContextMenu();
                return;
            }

            // Get group from target
            let itemSet = container.timeline._timeline.itemSet;
            let temp = itemSet.groupFromTarget(properties.event);
            group = itemSet.groupsData.get(temp.groupId);
            // Show the custom context menu
            showContextMenu(properties.event, group, selectedGroup === group);
        });

        // Function to show the custom popup menu
        function showContextMenu(event, group, isItemsSelected) {
            // Create a simple menu if not already created
            let menu = document.getElementById('custom-context-menu');
            if (!menu) {
                menu = document.createElement('div');
                menu.id = 'custom-context-menu';
                menu.style.position = 'absolute';
                menu.style.zIndex = 1000;
                menu.style.background = '#fff';
                menu.style.border = '1px solid #ccc';
                menu.style.padding = '5px';
                document.body.appendChild(menu);
            } else {
                // Clear previous menu options
                menu.innerHTML = '';
            }

            if(!isItemsSelected)
            {
                // Create "Select Items" option
                let selectOption = document.createElement('div');
                selectOption.innerHTML = 'Select Items';
                selectOption.style.padding = '5px';
                selectOption.addEventListener('click', () => {
                    selectItemsInGroup(group);
                    selectedGroup = group;
                    hideContextMenu();
                });
                menu.appendChild(selectOption);
            }
            else
            {
                // Create "Deselect Items" option
                let deselectOption = document.createElement('div');
                deselectOption.innerHTML = 'Deselect Items';
                deselectOption.style.padding = '5px';
                deselectOption.addEventListener('click', () => {
                    deselectItemsInGroup(group);
                    selectedGroup = null;
                    hideContextMenu();
                });
                menu.appendChild(deselectOption);
            }

            // Set the position of the menu
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;
            menu.style.display = 'block';

            // Hide the menu on document click
            document.addEventListener('click', hideContextMenu);
        }

        // Hide the context menu
        function hideContextMenu() {
            const menu = document.getElementById('custom-context-menu');
            if (menu) {
                menu.style.display = 'none';
            }
        }

        // Function to select items in the group
        function selectItemsInGroup(group) {
            // Your logic to select items in the group
            container.$server.onSelectItemInGroup(group.id);
//            console.log("Items selected in group:", group.id);
        }

        // Function to deselect items in the group
        function deselectItemsInGroup(group) {
            // Your logic to deselect items in the group
            container.$server.onDeselectItemInGroup(group.id);
//            console.log("Items deselected in group:", group.id);
        }

        container.timeline._timeline.on('rangechanged', function (properties) {
            const rangeChangedData = {
                start: properties.start,
                end: properties.end
            };
            container.$server.updateWindowRangeChangedEvent(rangeChangedData);
            processTimelineGroups(container);
        });

        /**
         * Sorts and filters an array of items based on their top position and start time.
         *
         * @param {Array} items - An array of items to be sorted and filtered.
         * @param {boolean} shouldStack - Flag indicating whether the items should be stacked or not.
         * @returns {Array} The sorted and filtered array of items.
         *
         * @example
         * const items = [
         *   {
         *     data: { start: new Date('2024-07-01') },
         *     dom: { box: document.querySelector('.item1') }
         *   },
         *   {
         *     data: { start: new Date('2024-06-30') },
         *     dom: { box: document.querySelector('.item2') }
         *   }
         * ];
         * const shouldStack = true;
         * const filteredItems = filterItems(items, shouldStack);
         */
        function filterItems(items, shouldStack) {
            items.sort((a, b) => {
                if (!shouldStack && a.dom?.box && b.dom?.box) {
                    const topA = parseInt(a.dom.box.style.top);
                    const topB = parseInt(b.dom.box.style.top);

                    if (!isNaN(topA) && !isNaN(topB)) {
                        return topA - topB;
                    }
                }
                return new Date(a.data.start) - new Date(b.data.start);
            });

            return items.filter(item => {
                if (item.dom?.box) {
                    const displayStyle = item.dom.box.style.display;
                    return displayStyle === '' || displayStyle !== 'none';
                }
                return true;
            });
        }

        /**
         * Stacks the items within a group and adjusts their vertical positions to avoid overlap.
         * Updates the group's height based on the stacked items.
         *
         * @param {Array} items - An array of items to be stacked.
         * @param {Object} group - The group object to which the items belong.
         * @param {HTMLElement} container - The container element that holds the group.
         * @param {number} OFFSET - The offset value to be added between items.
         * @returns {number} The calculated height of the group after stacking the items.
         *
         * @example
         * const items = [
         *   {
         *     data: { start: new Date(), end: new Date() },
         *     dom: { box: document.querySelector('.item-box') },
         *     height: 30,
         *     options: { margin: 10 }
         *   },
         *   // More items...
         * ];
         * const group = {
         *   _calculateHeight: function(margin) { ... },
         *   _applyGroupHeight: function(height) { ... },
         *   props: { label: { height: 20 } }
         * };
         * const container = document.querySelector('.container');
         * const OFFSET = 10;
         * const groupHeight = stackGroup(items, group, container, OFFSET);
         */
        function stackGroup(items, group, container, OFFSET) {
            let maxHeight = 0;
            let groupHeight = OFFSET;
            const minHeight = (items.length > 0) ? group._calculateHeight(items[0].options.margin) : group.props.label.height;
            const TOP_OFFSET_PX = '5px';

            if (items.length > 0) {
                if (items[0].dom?.box) {
                    items[0].dom.box.style.top = TOP_OFFSET_PX;
                }

                for (let i = 1; i < items.length; i++) {
                    const current = items[i];
                    const previous = items[i - 1];

                    if (current.dom?.box && previous.dom?.box) {
                        const currentStart = current.data.start.getTime();
                        const previousEnd = previous.data.end.getTime();

                        if (currentStart === previousEnd) {
                            if (!previous.dom.box.style.top) {
                                previous.dom.box.style.top = TOP_OFFSET_PX;
                                current.dom.box.style.top = TOP_OFFSET_PX;
                            } else {
                                current.dom.box.style.top = previous.dom.box.style.top;
                            }
                        } else {
                            current.dom.box.style.top = findTopValue(current, i - 1, items, OFFSET);
                        }

                        const currentTop = current.dom.box.style.top ? parseInt(current.dom.box.style.top) : 0;
                        if ((currentTop + current.height) > maxHeight) {
                            maxHeight = currentTop + current.height;
                        }
                    }
                }

                groupHeight = (items.length === 1) ? (minHeight + OFFSET) : (maxHeight + OFFSET);
                group._applyGroupHeight(groupHeight);
                group.isHightUpdate = true;
            } else if (group.isHightUpdate) {
                groupHeight = (minHeight > maxHeight) ? (minHeight + OFFSET) : (maxHeight + OFFSET);
                group._applyGroupHeight(groupHeight);
                group.isHightUpdate = false;
            }
            return groupHeight;
        }

        /**
         * Calculates the top position for the current item based on the positions and end times of previous items.
         *
         * @param {Object} current - The current item for which the top position is being calculated.
         * @param {number} previousIndex - The index of the previous item in the items array.
         * @param {Array} items - An array of items containing the current and previous items.
         * @param {number} OFFSET - The offset value to be added between items.
         * @returns {string} The calculated top position for the current item in pixels.
         *
         * @example
         * const current = {
         *   data: { start: new Date(), end: new Date() },
         *   dom: { box: document.querySelector('.current-box') },
         *   height: 30
         * };
         * const items = [
         *   {
         *     data: { start: new Date(), end: new Date() },
         *     dom: { box: document.querySelector('.previous-box') },
         *     height: 30
         *   }
         * ];
         * const OFFSET = 10;
         * const topValue = findTopValue(current, items.length - 1, items, OFFSET);
         */
        function findTopValue(current, previousIndex, items, OFFSET) {
            if (previousIndex < 0) {
                return OFFSET + 'px';
            }

            const previous = items[previousIndex];
            if (previous.dom?.box) {
                const currentStart = current.data.start.getTime();
                const previousEnd = previous.data.end.getTime();

                if (currentStart >= previousEnd) {
                    return findTopValue(current, previousIndex - 1, items, OFFSET);
                } else {
                    const previousTop = previous.dom.box.style.top ? parseInt(previous.dom.box.style.top) : 0;
                    const newTop = previousTop + previous.height + OFFSET;
                    return newTop + 'px';
                }
            }

            return findTopValue(current, previousIndex - 1, items, OFFSET);
        }

        /**
         * Adjusts the positions of items in a group to unstack them and updates the group's height.
         *
         * @param {Object} group - The group object containing items to be adjusted.
         * @param {number} OFFSET - The offset value for positioning the items within the group.
         * @param {boolean} isReset - Flag indicating whether to reset the position of the items.
         *                            - `true`: Reset the positions.
         *                            - `false`: Adjust the positions without resetting.
         * @returns {number} The calculated height of the group after adjustment.
         *
         * @example
         * const group = {
         *   visibleItems: { ... },
         *   dom: { label: document.querySelector('.group-label') },
         *   props: { label: { height: 20 } },
         *   _calculateHeight: function(margin) { ... },
         *   _applyGroupHeight: function(height) { ... }
         * };
         * const OFFSET = 10;
         * const isReset = true;
         * const groupHeight = unStackGroup(group, OFFSET, isReset);
         */
        function unStackGroup(group, OFFSET, isReset) {
            let items = Object.values(group.visibleItems);
            const minHeight = (items.length > 0) ? group._calculateHeight(items[0].options.margin) : group.props.label.height;
            let currentHeight = group.dom.label.offsetHeight;
            let maxHeight = 0;
            let groupHeight = OFFSET;

            for (let i = 1; i < items.length; i++) {
                const currentItem = items[i];
                const prevItem = items[i - 1];

                if (currentItem.dom?.box && prevItem.dom?.box) {
                    const currentStart = currentItem.data.start.getTime();
                    const prevStart = prevItem.data.start.getTime();
                    const currentEnd = currentItem.data.end.getTime();
                    const prevEnd = prevItem.data.end.getTime();

                    if(isReset)
                    {
                        if(i===1)
                            prevItem.dom.box.style.top = `${OFFSET}px`;
                        currentItem.dom.box.style.top = `${OFFSET}px`;
                    }
                    // Adjust top position if items have the same start time & end
//                    if (currentStart === prevStart && currentEnd === prevEnd) {
//                        const prevTop = parseInt(prevItem.dom.box.style.top) || 0;
//                        currentItem.dom.box.style.top = `${prevTop + currentItem.height}px`;
//                    }

                    // Update maxHeight if current item exceeds it
                    const currentTop = parseInt(currentItem.dom.box.style.top) || 0;
                    if (currentTop + currentItem.height > maxHeight) {
                        maxHeight = currentTop + currentItem.height;
                    }
                }
            }
            groupHeight = (items.length > 1) ?  (maxHeight + OFFSET) : (minHeight + OFFSET);
            group._applyGroupHeight(groupHeight);
            group.isHightUpdate = true;
            return groupHeight;
        }

        /**
         * Toggles the display of a button within a specified group's.
         *
         * @param {boolean} isShowButton - Determines whether the button should be shown or hidden.
         *                                  - `true`: Show the button.
         *                                  - `false`: Hide the button.
         * @param {Object} group - The group object which contains the DOM elements.
         * @param {Object} [group.dom] - The DOM elements associated with the group.
         * @param {HTMLElement} [group.dom.label] - The label element of the group that may contain the button.
         * @returns {HTMLElement|null} The button element if found, otherwise `null`.
         *
         * @example
         * const group = {
         *   dom: {
         *     label: document.querySelector('.group-label')
         *   }
         * };
         * toggleButtonDisplay(true, group);  // Shows the button within the group's label
         * toggleButtonDisplay(false, group); // Hides the button within the group's label
         */
        function toggleButtonDisplay(isShowButton, group) {
            const button = (group.dom?.label) ? group.dom.label.querySelector("button") : null;
            if (button) {
                button.style.display = isShowButton ? '' : 'none';
            }
            return button;
        }

        /**
         * Processes the groups in the timeline, stacks or unstacks items within groups, and handles the display of toggle buttons.
         *
         * @param {Object} container - The container object containing the timeline and its settings.
         *
         */
        function processTimelineGroups(container) {
            // Get the groups from the timeline
            const groups = container.timeline._timeline.itemSet.groups;
            const visibleGroups = container.timeline._timeline.itemSet.getVisibleGroups();
            const OFFSET = 5;
            // Loop through each group
            Object.values(groups).forEach(group => {
                if (!visibleGroups.includes(group.groupId.toString())) {
                    return;
                }
                let items = Object.values(group.visibleItems);
                const shouldStack = (typeof group.isCollapsed === "undefined") ? container.timeline._timeline.itemSet.options.stack : !group.isCollapsed;
                items = filterItems(items, shouldStack);

                // Set initial collapse state if not defined
                if (group.isCollapsed === undefined || group.isCollapsed === null) {
                    group.isCollapsed = !shouldStack;
                }

                if (shouldStack) {
                    if(items.length === 0 && !group.isHightUpdate) {
                        return;
                    }
                    const groupHeight = stackGroup(items, group, container, OFFSET);
                    const isShowButton = items.length > 1 && (groupHeight > (items[0].height + (OFFSET * 2)));
                    const button = toggleButtonDisplay(isShowButton, group);

                    if (isShowButton && group.dom.label && !button) {
                        const button = document.createElement("button");

                        // Set button class based on the collapse state
                        button.classList.add(group.isCollapsed ? "icon-collapsed" : "icon-expanded");
                        button.groupID = group.groupId;
                        group.dom.label.appendChild(button);

                        // Event listener for button click
                        button.addEventListener("click", (event) => {
                            const groupID = event.target.groupID;
                            const group = container.timeline._timeline.itemSet.groups[groupID];
                            group.isShowHideCall = true;

                            if (group.isCollapsed || button.classList.contains('icon-collapsed')) {
                                button.classList.replace("icon-collapsed", "icon-expanded");
                                group.isCollapsed = false;
                                stackGroup(items, group, container, OFFSET);
                            } else {
                                button.classList.replace("icon-expanded", "icon-collapsed");
                                group.isCollapsed = true;
                                unStackGroup(group, OFFSET, true);
                            }
                            event.stopPropagation();
                        });
                    }
                } else {
                    // When it does not stack and if items overlap, add some space at the top
                    const groupHeight = (items.length > 1) ? unStackGroup(group, OFFSET, group.isCollapsed) : 0;
                    const isShowButton = (items.length > 1);// && (groupHeight > (items[0].height + (OFFSET * 2)));
                    const button = toggleButtonDisplay(isShowButton, group);
                }
            });
        }

        container.timeline._timeline.on("changed", () => {
            processTimelineGroups(container);
            this._updateConnections(container, false);
            this._updateTimelineHeight(container);
        });

        let startX, startY = -10000;
        let startPointY = -10000;
        let startPointTime, endPointTime = 0;
        let mouseX;
        container.timeline._timeline.on("mouseDown", (e) => {
            startPointTime = e.time.getTime();
            startPointY = e.y;
            startX = e.event.x;
            startY = e.event.y;
            if (e.event.shiftKey || e.event.ctrlKey) {
                container.timeline._timeline.range.options.moveable = false;
                container.timeline._timeline.touch.allowDragging = false;
                window.vcftimeline.startPointTime = startPointTime;
                window.vcftimeline.isMouseDown = true;
            }
        });

        container.timeline._timeline.on('mouseMove', (e) => {
            mouseX = e.event.clientX;
            if ((e.event.shiftKey || e.event.ctrlKey) && window.vcftimeline.isMouseDown) {
                container.timeline._timeline.range.options.moveable = false;
                let endPointY = e.y;
                let endX = e.event.clientX;
                let endY = e.event.clientY;
                endPointTime = e.time.getTime();
                if (startX !== -10000 && startY !== -10000) {
                    this._drawRectangleWhenDragging(container, startX, startY, endX, endY);
                }
                if (e.event.shiftKey)
                    this._updateMultiSelectionByDragAndDrop(container, startPointTime, endPointTime, startPointY, endPointY);
            }
        });

        container.timeline._timeline.on("mouseUp", (e) => {
            let selectionElement = document.getElementById("selection");
            selectionElement.style.display = "none";
            endPointTime = e.time.getTime();
            if (!container.timeline._timeline.range.options.moveable) container.timeline._timeline.range.options.moveable = true;

            if (e.event.ctrlKey) {
                if (window.vcftimeline.isMouseDown) {
                    if (endPointTime < window.vcftimeline.startPointTime) {
                        window.vcftimeline.endPointTime = window.vcftimeline.startPointTime;
                        window.vcftimeline.startPointTime = endPointTime;
                    } else {
                        window.vcftimeline.endPointTime = endPointTime;
                    }
                    if (e.group && e.what !== 'item') {
                        container.$server.jsAddItem(window.vcftimeline.startPointTime, window.vcftimeline.endPointTime, e.group, true);
                    }
                }
            }

            if (e.event.shiftKey || e.event.ctrlKey) {
                window.vcftimeline.isMouseDown = false;
                startPointTime = 0;
                startPointY = -1000000;
                startX = -10000;
                startY = -10000;
                startPointY = -10000;
                startPointTime = 0;
                endPointTime = 0;
            }
        });

        setInterval(function () {
            let isDragging = container.timeline._timeline.itemSet.touchParams.itemIsDragging;
            let isResizingRight = container.timeline._timeline.itemSet.touchParams.dragRightItem;
            let isResizingLeft = container.timeline._timeline.itemSet.touchParams.dragLeftItem;
            let isResizing = isResizingRight !== isResizingLeft;
            if (isDragging) {
                let multiple = false;
                if (container.timeline._timeline.itemSet.touchParams.itemProps) multiple = container.timeline._timeline.itemSet.touchParams.itemProps.length > 1;
                let itemsInitialXMap = null;
                selectedItems = null;
                if (multiple) {
                    itemsInitialXMap = new Map();
                    container.timeline._timeline.itemSet.touchParams.itemProps.forEach((obj) => {
                        itemsInitialXMap.set(obj.data.id, obj.initialX);
                    });
                    selectedItems = Array.from(container.timeline._timeline.itemSet.touchParams.itemProps, (obj) => obj.item);
                }

                let ix = container.timeline._timeline.itemSet.touchParams.itemProps[0].initialX;
                let item = container.timeline._timeline.itemSet.touchParams.selectedItem;
                let range = container.timeline._timeline.getWindow();
                let widthInPixels = container.timeline._timeline.body.domProps.lastWidth;
                let centerOfTimelineInPixels = container.timeline._timeline.dom.container.offsetLeft + container.timeline._timeline.body.domProps.lastWidth / 2;
                let mouseAtLeftOfCenter = mouseX < centerOfTimelineInPixels;
                let widthInMilliseconds = range.end.valueOf() - range.start.valueOf();

                // handle autoscaling when moving, not resizing
                if (mouseAtLeftOfCenter && item.data.start <= range.start && (options.min === undefined || range.start > new Date(options.min)) && !isResizing) {
                    window.vcftimeline._moveWindowToRight(container, range, widthInMilliseconds);
                    if (multiple) {
                        container.timeline._timeline.itemSet.touchParams.itemProps.forEach((ip) => {
                            let id = ip.data.id;
                            let initialXValue = itemsInitialXMap.get(id);
                            ip.initialX = initialXValue + widthInPixels / 50;
                        });
                        if (selectedItems)
                            selectedItems.forEach((selectedItem) => {
                                selectedItem.data.start = new Date(selectedItem.data.start.valueOf() - widthInMilliseconds / 50);
                                selectedItem.data.end = new Date(selectedItem.data.end.valueOf() - widthInMilliseconds / 50);
                            });
                    } else {
                        container.timeline._timeline.itemSet.touchParams.itemProps[0].initialX = ix + widthInPixels / 50;
                        item.data.start = new Date(item.data.start.valueOf() - widthInMilliseconds / 50);
                        item.data.end = new Date(item.data.end.valueOf() - widthInMilliseconds / 50);
                    }
                } else if (!mouseAtLeftOfCenter && item.data.end >= range.end && (options.max === undefined || range.end < new Date(options.max)) && !isResizing) {
                    window.vcftimeline._moveWindowToLeft(container, range, widthInMilliseconds);
                    if (multiple) {
                        container.timeline._timeline.itemSet.touchParams.itemProps.forEach((ip) => {
                            let id = ip.data.id;
                            let initialXValue = itemsInitialXMap.get(id);
                            ip.initialX = initialXValue - widthInPixels / 50;
                        });
                        if (selectedItems)
                            selectedItems.forEach((selectedItem) => {
                                selectedItem.data.start = new Date(selectedItem.data.start.valueOf() + widthInMilliseconds / 50);
                                selectedItem.data.end = new Date(selectedItem.data.end.valueOf() + widthInMilliseconds / 50);
                            });
                    } else {
                        container.timeline._timeline.itemSet.touchParams.itemProps[0].initialX = ix - widthInPixels / 50;
                        item.data.start = new Date(item.data.start.valueOf() + widthInMilliseconds / 50);
                        item.data.end = new Date(item.data.end.valueOf() + widthInMilliseconds / 50);
                    }
                }

                // auto scroll to left when resizing left
                if (item.data.start <= range.start && (options.min === undefined || range.start > new Date(options.min)) && isResizingLeft) {
                    window.vcftimeline._moveWindowToRight(container, range, widthInMilliseconds, widthInPixels, ix);
                    item.data.start = new Date(item.data.start.valueOf() - widthInMilliseconds / 50);
                }

                // auto scroll to right when resizing left
                if (item.data.start >= range.end && (options.max === undefined || range.end < new Date(options.max)) && isResizingLeft) {
                    window.vcftimeline._moveWindowToLeft(container, range, widthInMilliseconds, widthInPixels, ix);
                    item.data.start = new Date(item.data.start.valueOf() + widthInMilliseconds / 50);
                }

                // auto scroll to right when resizing right
                if (item.data.end >= range.end && (options.max === undefined || range.end < new Date(options.max)) && isResizingRight) {
                    window.vcftimeline._moveWindowToLeft(container, range, widthInMilliseconds, widthInPixels, ix);
                    item.data.end = new Date(item.data.end.valueOf() + widthInMilliseconds / 50);
                }

                // auto scroll to left when resizing right
                if (item.data.end <= range.start && (options.min === undefined || range.start > new Date(options.min)) && isResizingRight) {
                    window.vcftimeline._moveWindowToRight(container, range, widthInMilliseconds, widthInPixels, ix);
                    item.data.end = new Date(item.data.end.valueOf() - widthInMilliseconds / 50);
                }
            }
        }, 100);
    },

    _updateMultiSelectionByDragAndDrop(container, startPointTime, endPointTime, startPointY, endPointY) {

        let itemSet = container.timeline._timeline.itemSet;
        let itemIds = "";
        let itemArray = Object.values(itemSet.items);
        let x0 = startPointTime < endPointTime ? startPointTime : endPointTime;
        let x1 = startPointTime > endPointTime ? startPointTime : endPointTime;
        let y0 = startPointY < endPointY ? startPointY : endPointY;
        let y1 = startPointY > endPointY ? startPointY : endPointY;
        for (let i = 0; i < itemArray.length; i++) {
            let groupItemTemp = itemSet.groups[itemArray[i].parent.groupId];
            let itemY = groupItemTemp.top + itemArray[i].top;

            let Ax0 = itemArray[i].data.start.getTime();
            let Ax1 = itemArray[i].data.end.getTime();
            let Ay0 = itemY;
            let Ay1 = itemY + itemArray[i].height;
            if (startPointTime !== 0)
                if ((x0 <= Ax0 && x1 >= Ax0 && y0 <= Ay0 && y1 >= Ay0) || (x0 <= Ax0 && x1 >= Ax0 && y0 <= Ay1 && y1 >= Ay1) || (x0 <= Ax1 && x1 >= Ax1 && y0 <= Ay0 && y1 >= Ay0) || (x0 <= Ax1 && x1 >= Ax1 && y0 <= Ay1 && y1 >= Ay1) || (Ax0 <= x0 && Ax1 >= x0 && Ay0 <= y0 && Ay1 >= y0) || (Ax0 <= x0 && Ax1 >= x0 && Ay0 <= y1 && Ay1 >= y1) || (Ax0 <= x1 && Ax1 >= x1 && Ay0 <= y0 && Ay1 >= y0) || (Ax0 <= x1 && Ax1 >= x1 && Ay0 <= y1 && Ay1 >= y1) || (Ax0 <= x0 && Ax1 >= x1 && Ay0 >= y0 && Ay1 <= y1) || (Ax0 >= x0 && Ax1 <= x1 && Ay0 <= y0 && Ay1 >= y1))
                    // if (x0 <= itemArray[i].data.start.getTime() && x1 >= itemArray[i].data.end.getTime()) {
                    //
                    //     if (y0 <= itemY && y1 >= itemY + itemArray[i].height) {
                    if (itemIds === "") itemIds = itemArray[i].id.toString(); else itemIds += "," + itemArray[i].id.toString();
            //     }
            //
            // }
        }
        if (startPointTime !== 0) container.$server.onSelect(itemIds);
        // this.onSelectItem(container, itemIds, false);
    },

    setUseLineConnector: function (container, bUseLineConnector) {
        this._updateConnections(container, bUseLineConnector);
    },

    setHighlightRange: function (container, start, end) {
        container.timeline._timeline.on("changed", () => {
            container.timeline._timeline.timeAxis._repaintLabels();
            let left = (start - container.timeline._timeline.range.start) * container.timeline._timeline.body.domProps.centerContainer.width / (container.timeline._timeline.range.end - container.timeline._timeline.range.start);
            let width = (end - start) * container.timeline._timeline.body.domProps.centerContainer.width / (container.timeline._timeline.range.end - container.timeline._timeline.range.start);
            container.timeline._timeline.timeAxis._repaintMinorLine(left, width, "both", "vis-grid-highlighted");
        });
    },
    _moveWindowTo(container, dateStart, dateEnd){
        container.timeline._timeline.setWindow(new Date(dateStart), new Date(dateEnd), {animation: true});
    },
    _moveWindowToRight(container, range, widthInMilliseconds) {
        container.timeline._timeline.setWindow(new Date(range.start.valueOf() - widthInMilliseconds / 50), new Date(range.end.valueOf() - widthInMilliseconds / 50), {animation: false});
    },

    _moveWindowToLeft(container, range, widthInMilliseconds) {
        container.timeline._timeline.setWindow(new Date(range.start.valueOf() + widthInMilliseconds / 50), new Date(range.end.valueOf() + widthInMilliseconds / 50), {animation: false});
    },

    _processOptions: function (container, optionsJson) {
        let parsedOptions = JSON.parse(optionsJson);

        delete parsedOptions.snapStep;

        let autoZoom = parsedOptions.autoZoom;
        delete parsedOptions.autoZoom;

        let tooltipOnItemUpdateTime = parsedOptions.tooltipOnItemUpdateTime;
        let tooltipDateFormat = parsedOptions.tooltipOnItemUpdateTimeDateFormat;
        let tooltipTemplate = parsedOptions.tooltipOnItemUpdateTimeTemplate;
        delete parsedOptions.tooltipOnItemUpdateTime;
        delete parsedOptions.tooltipOnItemUpdateTimeDateFormat;
        delete parsedOptions.tooltipOnItemUpdateTimeTemplate;

        let defaultOptions = {
            onMove: function (item, callback) {
                let oldItem = container.timeline._timeline.itemSet.itemsData.get(item.id);

                let isResizedItem = oldItem.end.getTime() - oldItem.start.getTime() !== item.end.getTime() - item.start.getTime();
                let moveItem = true;

                if (isResizedItem && (item.start.getTime() >= item.end.getTime() || item.end.getTime() <= item.start.getTime())) {
                    moveItem = false;
                }

                if (moveItem) {
                    callback(item);
                    let startDate = window.vcftimeline._convertDate(item.start);
                    let endDate = window.vcftimeline._convertDate(item.end);
                    //update connections
                    window.vcftimeline._updateConnections(container, false);
                    //call server
                    container.$server.onMove(item.id, startDate, endDate, isResizedItem);
                } else {
                    // undo resize
                    callback(null);
                }
            },

            // snap: function (date, scale, step) {
            //     let hour = snapStep * 60 * 1000;
            //     return Math.round(date / hour) * hour;
            // },
            onRemove: function (item, callback) {
                container.$server.onRemove(item.id);
            },
            template: function (item, element, data) {
                if (item.editing && data.content.startsWith('<input')) {
                    var inputElement = document.createElement('input');
                    inputElement.style.width = '100%';
                    inputElement.value = data.content.replace('<input>', '');
                    inputElement.onblur = function () {
                        data.content = inputElement.value;
                        item.editing = false;
                        container.$server.updateItemTitle(data);
                        setTimeout(() => container.timeline._timeline.itemsData.update(data), 0);
                        // container.timeline._timeline.itemsData.update(data);
                    };
                    inputElement.onkeydown = function (event) {
                        if (event.key === 'Enter' || event.key === 'Escape') {
                            // If Enter was pressed, update the item content
                            if (event.key === 'Enter') {
                                item.content = inputElement.value;
                            }
                            item.editing = false;
                            container.timeline._timeline.itemSet.itemsData.update(item);
                        }
                    };
                    setTimeout(() => inputElement.focus(), 300);
                    return inputElement;
                } else {
                    return data.content;
                }
            }
        }

        let options = {};
        Object.assign(options, parsedOptions, defaultOptions);

        if (autoZoom && options.min && options.max) {
            options.start = options.min;
            options.end = options.max;
        }

        if (tooltipOnItemUpdateTime) {
            (options.editable = {
                add: true, updateTime: true, updateGroup: true, remove: true, overrideItems: false
            });
            (options.tooltipOnItemUpdateTime = {
                template: function (item) {
                    let startDate = moment(item.start).format("MM/DD/YYYY HH:mm");
                    let endDate = moment(item.end).format("MM/DD/YYYY HH:mm");

                    if (tooltipDateFormat) {
                        startDate = moment(item.start).format(tooltipDateFormat);
                        endDate = moment(item.end).format(tooltipDateFormat);
                    }
                    if (tooltipTemplate) {
                        let templateCopy = tooltipTemplate;
                        templateCopy = templateCopy.replace("item.start", startDate);
                        templateCopy = templateCopy.replace("item.end", endDate);
                        return templateCopy;
                    } else {
                        return "Start: " + startDate + "</br> End: " + endDate;
                    }
                },
            });
        }

        return options;
    },

    setOptions: function (container, optionsJson) {
        let options = this._processOptions(container, optionsJson);
        container.timeline._timeline.setOptions(options);
    },

    onSelectItem: function (container, onSelectItem, autoZoom) {
        let temp = onSelectItem.split(",");
        container.timeline._timeline.setSelection(temp);
    },

    onSelectGroup: function (container, selectGroupID) {
        if (container && container.timeline && container.timeline._timeline && container.timeline._timeline.itemSet) {
            let itemSet = container.timeline._timeline.itemSet;
            if(itemSet && itemSet.groupsData)
            {
                let groups = itemSet.groups;
                if (groups && groups[selectGroupID]) {
                    let groupID = groups[selectGroupID].groupId;
                    let group = itemSet.groupsData.get(groupID);
                    if(group)
                    {
//                        container.$server.onSelectItemInGroup(group.id);
                        if (!group.nestedGroups)
                            this._updateGroupClassName(container, group, "vis-group-selected");
                    }
                } else {
                    console.warn('Group not found for the provided selectGroupID.');
                }
            } else {
                console.warn('Invalid group date structure.');
            }
        } else {
            console.warn('Invalid container or timeline structure.');
        }
    },

    addItem: function (container, newItemJson, autoZoom) {
        let parsedItem = JSON.parse(newItemJson);
        let item = {
            id: parsedItem.id,
            group: Number.parseInt(parsedItem.group),
            content: "new item",
            editable: {
                add: true, updateTime: true, updateGroup: true, remove: true, overrideItems: false
            },
            selectable: true,
            style: parsedItem.style,
            start: parsedItem.start,
            end: parsedItem.end,
            type: 0,
        };

        container.timeline._timeline.itemsData.add(item);
    },

    setGroups: function (container, groupsJson) {
         if(container.timeline)
         {
             let groupItems = new DataSet();
             let parsedGroupItems = JSON.parse(groupsJson);
             for (let i=0; i < parsedGroupItems.length; i++) {
                let nestedGroups = [];
                let groupsNested = [];
                try {
                    nestedGroups = parsedGroupItems[i].nestedGroups.split(",");
                    for (let j=0; j < nestedGroups.length; j++) {
                        groupsNested[j] = Number.parseInt(nestedGroups[j]);
                    }
                } catch (e) {
                    groupsNested = null;
                }
                groupItems.add( {
                    id : Number.parseInt(parsedGroupItems[i].groupId),
                    content : parsedGroupItems[i].content,
                    treeLevel : parsedGroupItems[i].treeLevel,
                    nestedGroups: groupsNested,
                    visible: parsedGroupItems[i].visible,
                    className: parsedGroupItems[i].className,
                });
             }

             container.timeline._timeline.setGroups(groupItems);
         }
    },

    setItems: function (container, itemsJson, autoZoom) {
        if(container.timeline)
        {
            let items = new DataSet(JSON.parse(itemsJson));
            container.timeline._timeline.setItems(items);
        }
    },

    revertMove: function (container, itemId, itemJson) {
        let itemData = container.timeline._timeline.itemSet.items[itemId].data;
        let parsedItem = JSON.parse(itemJson);
        itemData.start = parsedItem.start;
        itemData.end = parsedItem.end;

        container.timeline._timeline.itemSet.items[itemId].left =
            container.timeline._timeline.itemSet.items[itemId].conversion.toScreen(moment(itemData.start));
        container.timeline._timeline.itemsData.update(itemData);
    },

    removeItem: function (container, itemId) {
        container.timeline._timeline.itemsData.remove(itemId);
    },

    updateItemContent: function (container, itemId, newContent) {
        let itemData = container.timeline._timeline.itemSet.items[itemId].data;
        itemData.content = newContent;
        container.timeline._timeline.itemsData.update(itemData);
    },

    updateItemGroup: function (container, itemId, groupId) {
        let item = container.timeline._timeline.itemSet.items[itemId];
        if(item)
        {
            container.timeline._timeline.itemSet._moveToGroup(item, groupId)
            container.timeline._timeline.itemsData.update(item.data);
        }
    },

    _updateGroupClassName: function (container, group, newClassName) {
        var groupClass = group.className + " " + newClassName;

        let data = {
            id: Number.parseInt(group.id),
            content: group.content,
            treeLevel: group.treeLevel,
            nestedGroups: group.nestedGroups,
            visible: group.visible,
            className: groupClass,
        };
        this._removeGroupsClassName(container, group.id, "vis-group-unselected");
        container.timeline._timeline.itemSet.groups[group.id].setData(data);
    },

    //unselect everything
    _removeGroupsClassName: function (container, groupId, oldClassName) {

        let itemSet = container.timeline._timeline.itemSet;
        let parsedGroups = Object.keys(itemSet.groups);
        for (let anyGroupId = 0; anyGroupId < parsedGroups.length; anyGroupId++) {
            if (Number.parseInt(parsedGroups[anyGroupId]) !== Number.parseInt(groupId)) {
                let tempGroup = itemSet.groupsData.get(Number.parseInt(parsedGroups[anyGroupId]));
                if (tempGroup != null) {
                    var groupClass = tempGroup.className;
                    if (groupClass != null) {
                        groupClass = groupClass.replace("vis-group-selected", "");
                        groupClass += " "  +  oldClassName;
                    } else {
                        groupClass = oldClassName;
                    }

//                    if (!groupClass) {
//                        groupClass = null;
//                    }

                    let data = {
                        id: Number.parseInt(tempGroup.id),
                        content: tempGroup.content,
                        treeLevel: tempGroup.treeLevel,
                        nestedGroups: tempGroup.nestedGroups,
                        visible: tempGroup.visible,
                        className: groupClass,
                    };
                    container.timeline._timeline.itemSet.groups[tempGroup.id].setData(data);
                }
            }
        }
    },

    setZoomOption: function (container, zoomDays) {
        let startDate;
        let selectedItems = container.timeline._timeline.getSelection();
        if (selectedItems.length > 0) {
            let selectedItem = selectedItems.length > 1 ? this._sortItems(selectedItems)[0] : selectedItems[0];
            startDate = container.timeline._timeline.itemSet.items[selectedItem].data.start;
        } else {
            let range = container.timeline._timeline.getWindow();
            startDate = range.start;
        }

        let start = moment(startDate);
        start.hour(0);
        start.minutes(0);
        start.seconds(0);

        let end = moment(startDate);
        end.add(zoomDays, "days");

        container.timeline._timeline.setWindow({
            start: start, end: end,
        });
    },

    _convertDate: function (date) {
        let local = new Date(date);
        local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return local.toJSON().slice(0, 19);
    },

    _sortItems: function (items) {
        return items.sort(function (item1, item2) {
            let item1_date = new Date(item1.start), item2_date = new Date(item2.start);
            return item1_date - item2_date;
        });
    },

    _createConnections: function (items) {
        // Sort items in order to be able to create connections for timeline-arrow
        // (horizontal line)
        let sortedItems = this._sortItems(items);

        // Create connections for items
        let connections = [];
        for (let i = 0; i < sortedItems.length - 1; i++) {
            let element = sortedItems[i];
            let nextElement = sortedItems[i + 1];

            let id = i + 1;
            let id_item_1 = element.id;
            let id_item_2 = nextElement.id;

            let item = {};
            item["id"] = id;
            item["id_item_1"] = id_item_1;
            item["id_item_2"] = id_item_2;

            connections.push(item);
        }
        return connections;
    },

    _updateConnections: function (container, bUseLineConnector) {
        if (bUseLineConnector) {
            let connections = this._createConnections(container.timeline._timeline.itemsData.get());
            container.timeline.setDependencies(connections);
        } else {
            container.timeline.setDependencies([]);
        }
    },

    _updateTimelineHeight: function (container) {
        if (container.timelineHeight === undefined) {
            container.timelineHeight = container.timeline._timeline.dom.container.getBoundingClientRect().height;
        }
        if (container.timeline._timeline.options.height === undefined) {
            container.timeline._timeline.options.height = container.timelineHeight;
        }
    },

    _drawRectangleWhenDragging: function (container, startX, startY, endX, endY) {
        let selectionElement = document.getElementById("selection");
        selectionElement.style.left = startX + "px";
        selectionElement.style.top = startY + "px";
        selectionElement.style.width = "0";
        selectionElement.style.height = "0";
        selectionElement.style.display = "block";

        if (startX !== undefined && startY !== undefined) {

            let width = Math.abs(endX - startX);
            let height = Math.abs(endY - startY);

            selectionElement.style.width = width + "px";
            selectionElement.style.height = height + "px";

            selectionElement.style.left = (endX < startX) ? (startX - width) + "px" : startX + "px";
            selectionElement.style.top = (endY < startY) ? (startY - height) + "px" : startY + "px";
        }
    },
};