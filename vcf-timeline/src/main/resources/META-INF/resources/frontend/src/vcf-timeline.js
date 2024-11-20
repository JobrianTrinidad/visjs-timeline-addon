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
                    subgroupOrder: parsedGroupItems[i].subgroupOrder,
                    subgroupStack: parsedGroupItems[i].subgroupStack,
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
                    subgroup: parsedItems[i].subgroup,
                    subgroupOrder: parsedItems[i].subgroupOrder,
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

        vcftimeline.updateGroupSubgroupStack(container, groupsJson);


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

        // Define a variable to reference itemSet
        const itemSet = container.timeline._timeline.itemSet;

        // Define the custom tap handler
        const customTapHandler = function(event) {
            const oldSelection = itemSet.getSelection();  // Get current selection
            const item = itemSet.itemFromTarget(event);   // Get item from the event target

            // Custom validation: if there's an old selection but no new item
            if (oldSelection != null && oldSelection.length > 0 && !item) {
                return;
            }

            // Call the original _onSelectItem function
            itemSet._onSelectItem(event);
        };

        // Overwrite the existing tap handler
        itemSet.hammer.off("tap");  // Remove the original tap handler
        itemSet.hammer.on("tap", customTapHandler);  // Set the custom handler

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
            const itemSet = container.timeline._timeline.itemSet;
            const temp = itemSet.groupFromTarget(properties.srcEvent);
            const group = itemSet.groupsData.get(temp.groupId);
            container.$server.onGroupSelected(group.id);
            if (!group.nestedGroups)
                this._updateGroupClassName(container, group, "vis-group-selected");
            else
            {
                for (const nestedGroup of group.nestedGroups) {
                    this._removeGroupsClassName(container, nestedGroup, "vis-group-unselected");
                }
            }
        });

        var selectedGroup = null;
        container.timeline._timeline.on("contextmenu", (properties) => {
            // Prevent the default context menu
            properties.event.preventDefault();
            // Get the coordinates of the click
            const x = properties.event.clientX;
            const y = properties.event.clientY;
            const itemSet = container.timeline._timeline.itemSet;
            if(properties.what === "group-label")
            {
                const temp = itemSet.groupFromTarget(properties.event);
                const group = itemSet.groupsData.get(temp.groupId);
                container.$server.loadContextMenuOptions(x, y, group.id, "Group");
            }
            else if (properties.what === "item")
            {
                const item = itemSet.itemFromTarget(properties.event);
                container.$server.loadContextMenuOptions(x, y, item.id, "Item");
            }
            else
            {
                container.$server.loadContextMenuOptions(x, y, -1, properties.what);
            }
        });

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
                    // Step 1: Order by subgroup
                    if (a.data.subgroup && b.data.subgroup) {
                        const subgroupComparison = a.data.subgroup.localeCompare(b.data.subgroup);
                        if (subgroupComparison !== 0) {
                            return subgroupComparison; // Different subgroups
                        }
                    }

                    // Step 2: Order by subgroupOrder
                    if (a.data.subgroupOrder !== undefined && b.data.subgroupOrder !== undefined) {
                        const orderComparison = a.data.subgroupOrder - b.data.subgroupOrder;
                        if (orderComparison !== 0) {
                            return orderComparison; // Different subgroupOrder values
                        }
                    }

                    // Step 3: If same subgroup and subgroupOrder, order by position (top) if applicable
                    if (!shouldStack && a.dom?.box && b.dom?.box) {
                        const topA = parseInt(a.dom.box.style.top);
                        const topB = parseInt(b.dom.box.style.top);

                        if (!isNaN(topA) && !isNaN(topB)) {
                            return topA - topB; // Compare by top position
                        }
                    }

                    // Step 4: Fallback to sorting by start date
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

            if (items.length > 0) {
                let margin = items[0].options.margin;

                for (let i = 0; i < items.length; i++) {
                    items[i].top = null;
                }

                const placedItems = [];
                if (items[0].dom?.box) {
                    items[0].dom.box.style.top = ((!items[0].stackTop) ? OFFSET : items[0].stackTop) + 'px';
                    items[0].top = ((!items[0].stackTop) ? OFFSET : items[0].stackTop);
                    placedItems.push(items[0]);
                }

                for (let i = 1; i < items.length; i++) {
                    const current = items[i];
                    if (current.dom?.box ) {// &&
                        if(!current.stackTop)
                            findPreviousItem(placedItems, current, margin, OFFSET)
                        current.top = current.stackTop;
                        current.dom.box.style.top = current.stackTop + 'px';
                    }

                    const currentTop = current.dom.box.style.top ? parseInt(current.dom.box.style.top) : 0;
                    if ((currentTop + current.height) > maxHeight) {
                        maxHeight = currentTop + current.height;
                    }
                    // Add current item to placedItems for collision tracking
                    placedItems.push(current);
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

        function collision(item1, item2, margin) {
            // Small margin for floating-point precision
            const EPSILON = 0.01;
            // Rounding to 2 decimal points
            const item1Left = Math.round((item1.left + Number.EPSILON) * 100) / 100;
            const item1Width = Math.round((item1.width + Number.EPSILON) * 100) / 100;
            const item1Top = Math.round((item1.top + Number.EPSILON) * 100) / 100;
            const item1Height = Math.round((item1.height + Number.EPSILON) * 100) / 100;

            const item2Left = Math.round((item2.left + Number.EPSILON) * 100) / 100;
            const item2Width = Math.round((item2.width + Number.EPSILON) * 100) / 100;
            const item2Top = Math.round((item2.top + Number.EPSILON) * 100) / 100;
            const item2Height = Math.round((item2.height + Number.EPSILON) * 100) / 100;

            return !(
                item1Left + item1Width <= item2Left + EPSILON ||  // item1 is to the left of item2
                item2Left + item2Width <= item1Left + EPSILON     // item1 is to the right of item2
            ) && (
                item2Top === item1Top ||                                   // item1 and item2 are aligned vertically
                !(
                    item2Top + item2Height < item1Top  ||  // item1 is below item2 + margin.vertical
                    item1Top + item1Height < item2Top     // item1 is above item2 - margin.vertical
                )
            );
        }

        function findPreviousItem(items, current, margin, OFFSET) {
            const currentStart = current.data.start.getTime();
            const currentEnd = current.data.end.getTime();
            current.top = OFFSET;
            do {
                var collidingItem = null;
                for (let i = 0  ; i < items.length; i++) {
                    const previous = items[i];
                    const previousEnd = previous.data.end.getTime();
                    console.log("Previous = " + previous.content +  " Current = " + current.content + "  Overlap = "  + collision(current, previous, (margin == null ? void 0 : margin.item) || { vertical: defaultTopMargin }))
                    if (previous.top !== null && previous !== current && (collision(current, previous, (margin == null ? void 0 : margin.item) || { vertical: defaultTopMargin })))
                    {
                        collidingItem = previous;
                        current.top = previous.top;
                        if(collision(current, previous, (margin == null ? void 0 : margin.item) || { vertical: defaultTopMargin }))
                        {
                                const newTop = previous.top + previous.height + 1;
                                current.top = newTop;
                        }
                        break;
                    }
                }
            } while (collidingItem);
            current.stackTop = current.top;
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
            items = filterItems(items, false);
            const minHeight = (items.length > 0) ? group._calculateHeight(items[0].options.margin) : group.props.label.height;
            let currentHeight = group.dom.label.offsetHeight;
            let maxHeight = 0;
            let groupHeight = OFFSET;
            let itemTop = OFFSET;

            let topMap = {};
            if(group.groupSubgroupStack)
            {
                items.forEach(item => {
                    const groupName = item.data.subgroup;
                    const itemHeight = item.dom?.box?.offsetHeight || 0;
                    if (groupName) {
                        if (topMap[groupName] === undefined) {
                            if (Object.keys(topMap).length === 0)
                                topMap[groupName] = OFFSET;
                            else
                            {
                                itemTop = itemTop + itemHeight + 1;
                                topMap[groupName] = itemTop;
                            }
                        }
                    }
                });
                console.log(topMap);
            }
            if (Object.keys(topMap).length > 0) {
                // If topMap is not empty, calculate 'allgroup'
                const itemHeight = items[items.length - 1]?.dom?.box?.offsetHeight || 0; // Last item's height or 0
                topMap['allgroup'] = itemTop + itemHeight + 1;
            } else {
                // If topMap is empty, default 'allgroup' to OFFSET
                topMap['allgroup'] = OFFSET;
            }
            for (let i = 1; i < items.length; i++) {
               const currentItem = items[i];
               const prevItem = items[i - 1];

               if (currentItem.dom?.box && prevItem.dom?.box) {
                   const currentStart = currentItem.data.start.getTime();
                   const prevStart = prevItem.data.start.getTime();
                   const currentEnd = currentItem.data.end.getTime();
                   const prevEnd = prevItem.data.end.getTime();
                   const groupName = currentItem.data.subgroup;
                   if (group.groupSubgroupStack && groupName)
                       itemTop = topMap[groupName];
                   else
                       itemTop = topMap['allgroup'];

                   if (isReset) {
                       if (i === 1) {
                           if (prevItem.data.subgroup)
                               prevItem.dom.box.style.top = `${topMap[prevItem.data.subgroup]}px`;
                           else
                               prevItem.dom.box.style.top = `${itemTop}px`;
                       }
                       currentItem.dom.box.style.top = `${itemTop}px`;
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
            if(container.timeline._timeline.itemSet.options.stackSubgroups)
                return;
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
       if(container.timeline) container.timeline._timeline.setWindow(new Date(dateStart), new Date(dateEnd), {animation: true});
    },
    _moveWindowToRight(container, range, widthInMilliseconds) {
        if(container.timeline) container.timeline._timeline.setWindow(new Date(range.start.valueOf() - widthInMilliseconds / 50), new Date(range.end.valueOf() - widthInMilliseconds / 50), {animation: false});
    },

    _moveWindowToLeft(container, range, widthInMilliseconds) {
        if(container.timeline) container.timeline._timeline.setWindow(new Date(range.start.valueOf() + widthInMilliseconds / 50), new Date(range.end.valueOf() + widthInMilliseconds / 50), {animation: false});
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
            subgroup: parsedItem.subgroup,
            subgroupOrder: parsedItem.subgroupOrder,
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
                    subgroupOrder: parsedGroupItems[i].subgroupOrder,
                    subgroupStack: parsedGroupItems[i].subgroupStack,
                });
             }

             container.timeline._timeline.setGroups(groupItems);
             vcftimeline.updateGroupSubgroupStack(container, groupsJson);
         }
    },

    updateGroupSubgroupStack: function (container, groupsJson) {
        const groups = container.timeline._timeline.itemSet.groups;
        const parsedGroupItems = JSON.parse(groupsJson);

        parsedGroupItems.forEach(item => {
            const groupId = Number.parseInt(item.groupId, 10);

            // Check if the group ID exists in the groups object
            if (groups[groupId]) {
                // Update groupSubgroupStack
                groups[groupId].groupSubgroupStack = item.groupSubgroupStack;
            }
        });
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