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
            if(properties.event.srcEvent && properties.event.srcEvent.altKey) {
                const targetItem = container.timeline._timeline.itemSet.itemFromTarget(properties.event);
                if(targetItem) {
                    const targetSubgroup = targetItem.data.subgroup;
                    const items = container.timeline._timeline.itemSet.items;
                    const matchingIds = [];
                    for (const key in items) {
                        if (items.hasOwnProperty(key)) {
                            const item = items[key];
                            if (item.data.subgroup === targetSubgroup) {
                                matchingIds.push(item.data.id);
                            }
                        }
                    }
                    let combinedArray = [...properties.items, ...matchingIds];
                    let uniqueValues = [...new Set(combinedArray)];
                    temp = uniqueValues.join(',');
                }
            }
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
            renderTimelineGroups(container);
        });

        /**
         * Filters and sorts items based on their subgroups and visibility.
         *
         * @param {Array} items - Array of items to be filtered and sorted. Each item should have a `data` property containing at least:
         *                        - `subgroup` (optional): Subgroup identifier.
         *                        - `start` (required): Start date for sorting.
         *                        - `dom` (optional): DOM object containing a `box` element with a `style` property.
         * @returns {Array} - A new array of items, filtered to only include visible items, sorted by subgroup and start date.
         */
        function filterItems(items) {
            // Group items by 'subgroup', defaulting to 'No_Subgroup' if none is provided
            const groupedItems = items.reduce((groups, item) => {
                const subgroup = item.data.subgroup || 'No_Subgroup';
                (groups[subgroup] ||= []).push(item);
                return groups;
            }, {});

            // Sort each subgroup by the start date
            Object.values(groupedItems).forEach(subgroup => {
                subgroup.sort((a, b) => new Date(a.data.start) - new Date(b.data.start));
            });

            // Sort subgroups by the earliest start date of their first item
            const sortedGroups = Object.entries(groupedItems).sort(([, groupA], [, groupB]) => {
                const firstItemA = groupA[0]?.data.start || Infinity;
                const firstItemB = groupB[0]?.data.start || Infinity;
                return new Date(firstItemA) - new Date(firstItemB);
            });

            // Flatten sorted groups into a single array of items
            const sortedItemsArray = sortedGroups.flatMap(([, items]) => items);

            // Filter items to exclude those with a DOM `box` element set to `display: none`
            return sortedItemsArray.filter(item => {
                const displayStyle = item.dom?.box?.style?.display || '';
                return displayStyle === '' || displayStyle !== 'none';
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
                let topMap = {};
                const placedItems = [];
                if (items[0].dom?.box) {
                    items[0].dom.box.style.top = ((!items[0].stackTop) ? OFFSET : items[0].stackTop) + 'px';
                    items[0].top = ((!items[0].stackTop) ? OFFSET : items[0].stackTop);
                    placedItems.push(items[0]);
                    const groupName = items[0].data.subgroup;
                     if (groupName) {
                         if (topMap[groupName] === undefined) {
                          topMap[groupName] = items[0].top;
                           }
                      }
                }

                for (let i = 1; i < items.length; i++) {
                    const current = items[i];
                    if (current.dom?.box ) {// &&
                        const groupName = current.data.subgroup;
                        const groupTop = (groupName && topMap[groupName] !== undefined) ? topMap[groupName] : OFFSET;
                        if(!current.stackTop || group.isReCalculateStack)
                            calculateItemStuckTop(placedItems, current, margin, groupTop)
                        current.top = current.stackTop;
                        current.dom.box.style.top = current.stackTop + 'px';
                         if (groupName) {
                        if (topMap[groupName] === undefined) {
                         topMap[groupName] = current.top;
                           }
                        }
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
            group.isReCalculateStack = false;
            return groupHeight;
        }

        /**
         * Determines whether two items collide in a 2D space, considering margins and precision.
         *
         * @param {Object} item1 - The first item with dimensions: `left`, `width`, `top`, `height`.
         * @param {Object} item2 - The second item with dimensions: `left`, `width`, `top`, `height`.
         * @param {Object} margin - Optional margin for collision calculation (not used in current logic).
         * @returns {boolean} - `true` if the items collide; otherwise, `false`.
         *
         * @example
         * const hasCollision = collision(item1, item2, { vertical: 10 });
         */
        function collision(item1, item2, margin) {
            const EPSILON = 0.1;

            const roundToPrecision = (value, precision = 1) => {
                const factor = Math.pow(10, precision);
                return Math.round(value * factor) / factor;
            };

            const getRoundedDimensions = (item) => ({
                left: roundToPrecision(item.left),
                width: roundToPrecision(item.width),
                top: roundToPrecision(item.top),
                height: roundToPrecision(item.height),
            });

            const { left: item1Left, width: item1Width, top: item1Top, height: item1Height } = getRoundedDimensions(item1);
            const { left: item2Left, width: item2Width, top: item2Top, height: item2Height } = getRoundedDimensions(item2);

            const horizontallyOverlapping = !(item1Left + item1Width <= item2Left + EPSILON || item2Left + item2Width <= item1Left + EPSILON);
            const verticallyOverlapping = item2Top === item1Top ||
                !(item2Top + item2Height < item1Top || item1Top + item1Height < item2Top);

            return horizontallyOverlapping && verticallyOverlapping;
        }

        /**
         * Calculates and assigns the `top` position for an item in a stacked layout, avoiding collisions.
         *
         * @param {Array} items - Array of existing items for collision checks.
         * @param {Object} current - The item for which `top` is being calculated. Contains:
         *                           - `data.start`: Start date.
         *                           - `data.end`: End date.
         *                           - `top`: The current top position (will be modified).
         *                           - `stackTop`: Final calculated top position.
         *                           - `height`: Item height for positioning.
         * @param {Object} margin - Optional margins. Defaults to `{ vertical: defaultTopMargin }`.
         * @param {number} OFFSET - The initial top position for the item.
         *
         * @returns {void} - The function updates `current.top` and `current.stackTop`.
         *
         * @example
         * calculateItemStuckTop(existingItems, newItem, { vertical: 5 }, 10);
         */
        function calculateItemStuckTop(items, current, margin, OFFSET) {
            const defaultMargin = (margin?.item || { vertical: OFFSET });
            const currentStart = current.data.start.getTime();
            const currentEnd = current.data.end.getTime();

            current.top = OFFSET;

            let collidingItem;
            do {
                collidingItem = null;

                for (const previous of items) {
                    const previousStart = previous.data.start.getTime();
                    const previousEnd = previous.data.end.getTime();

                    if (previous.top !== null && previous !== current && collision(current, previous, defaultMargin)) {
                        collidingItem = previous;

                        // Increment current.top only if the current position still causes a collision
                        const potentialTop = previous.top + previous.height + 1;
                        current.top = collision(current, previous, defaultMargin) ? potentialTop : current.top;

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
        function unStackGroup(items, group, OFFSET, isReset) {
            if(!items || !group)
                return;
            const minHeight = (items.length > 0) ? group._calculateHeight(items[0].options.margin) : group.props.label.height;
            let currentHeight = group.dom.label.offsetHeight;
            let maxHeight = 0;
            let groupHeight = OFFSET;
            let isReCalculateUnStack = (group.topMap && group.topMap['topMapItemSize'] !== items.length) || group.isReCalculateUnStack
            let topMap = group.topMap && !isReCalculateUnStack ? group.topMap : {};
            topMap['topMapItemSize'] = items.length;
            let heightMap = {};
            group.topMap = topMap;
            if (group.groupSubgroupStack && items.length > 0 && items[0].data.subgroup)
            {
                topMap[items[0].data.subgroup] = OFFSET;
                heightMap[OFFSET] = items[0].data.end.getTime();
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
                   // Do not pass the heightMap if you want the group items in new line for every group
                   if(!currentItem.unStackTop || currentItem.unStackTop <= 0 || isReCalculateUnStack)
                        currentItem.unStackTop = calculateItemUnStackTop(groupName, group, prevItem, currentItem, OFFSET, heightMap);
                   currentItem.top = currentItem.unStackTop;
                   heightMap[currentItem.top] = currentEnd;
                   if (isReset) {
                       if (i === 1) {
                           if (prevItem.data.subgroup)
                           {
                               prevItem.top = calculateItemUnStackTop(prevItem.data.subgroup, group, null, prevItem, OFFSET, heightMap);
                               prevItem.dom.box.style.top = `${prevItem.top}px`;
                           }
                           else
                           {
                               prevItem.dom.box.style.top = `${currentItem.top}px`;
                               prevItem.top = currentItem.top;
                           }
                       }
                       currentItem.dom.box.style.top = `${currentItem.top}px`;
                   }
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
            group.isReCalculateUnStack = false;
            return groupHeight;
        }

        /**
         * Calculates the top position (`unStackTop`) for an item in a timeline.
         *
         * @param {string|null} groupName - The subgroup name of the item, or `null` if none.
         * @param {Object} group - The group object with stack configuration and top map.
         * @param {Object} [group.topMap] - A map of subgroup names or "allgroup" to their top positions.
         * @param {Object|null} prevItem - The previous item, or `null` if none.
         * @param {Object} currentItem - The current item with `data` and `dom` properties.
         * @param {number} OFFSET - The default starting offset for the item's top position.
         * @param {Object|null} heightMap - A map of top positions to end dates for stacking.
         * @returns {number} - The calculated top position for the item.
         *
         * @example
         * const top = calculateItemUnStackTop('subgroup', group, prevItem, currentItem, 10, heightMap);
         */
        function calculateItemUnStackTop(groupName, group, prevItem, currentItem, OFFSET, heightMap) {
            let itemTop = prevItem?.unStackTop || OFFSET;
            let topMap = group.topMap;

            if (group.groupSubgroupStack && groupName) {
                // Initialize topMap[groupName] if it doesn't exist or is invalid
                if (!Number.isFinite(topMap[groupName])) {
                    if (Object.keys(topMap).length === 1) {
                        topMap[groupName] = OFFSET;
                    } else if (heightMap) {
                        // Find the first available top position in heightMap
                        const entry = Object.entries(heightMap).find(([top, endDate]) =>
                            currentItem.data.start.getTime() > endDate
                        );

                        if (entry) {
                            itemTop = parseFloat(entry[0]);
                        } else {
                            // Default to the maximum top in heightMap
                            itemTop = Math.max(...Object.keys(heightMap).map(Number)) || OFFSET;
                            // Adjust with the current item's height
                            const itemHeight = currentItem?.dom?.box?.offsetHeight || 0;
                            itemTop += itemHeight + 1;
                        }
                        topMap[groupName] = itemTop;
                    } else {
                        // Handle cases where heightMap is not available
                        const itemHeight = currentItem?.dom?.box?.offsetHeight || 0;
                        itemTop += itemHeight + 1;
                        topMap[groupName] = itemTop;
                    }
                }

                itemTop = topMap[groupName];
            } else {
                // Handle 'allgroup' case
                if (!Number.isFinite(topMap['allgroup'])) {
                    if (Object.keys(topMap).length > 1) {
                        const itemHeight = prevItem?.dom?.box?.offsetHeight || 0;
                        topMap['allgroup'] = itemTop + itemHeight + 1;
                    } else {
                        topMap['allgroup'] = OFFSET;
                    }
                }
                itemTop = topMap['allgroup'];
            }

            return itemTop;
        }

        /**
         * Toggles the display of a button within a specified group's label.
         *
         * @param {boolean} isShowButton - Whether to show (`true`) or hide (`false`) the button.
         * @param {Object} group - The group object from the DataSet containing DOM elements.
         * @param {Object} [group.dom] - DOM elements associated with the group.
         * @param {HTMLElement} [group.dom.label] - The label element that may contain the button.
         * @returns {HTMLElement|null} - The button element if found; otherwise, `null`.
         *
         * @example
         * const group = dataSet.get(someGroupId); // Assume dataSet is a DataSet instance
         * toggleButtonDisplay(true, group);  // Shows the button for the group's label
         * toggleButtonDisplay(false, group); // Hides the button for the group's label
         */
        function toggleButtonDisplay(isShowButton, group) {
            const button = group.dom?.label?.querySelector("button") || null;
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
        function renderTimelineGroups(container) {
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
                items = filterItems(items);

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
                            items = Object.values(group.visibleItems);
                            items = filterItems(items);

                            if (group.isCollapsed || button.classList.contains('icon-collapsed')) {
                                button.classList.replace("icon-collapsed", "icon-expanded");
                                group.isCollapsed = false;
                                stackGroup(items, group, container, OFFSET);
                            } else {
                                button.classList.replace("icon-expanded", "icon-collapsed");
                                group.isCollapsed = true;
                                unStackGroup(items, group, OFFSET, true);
                            }
                            event.stopPropagation();
                        });
                    }
                } else {
                    // When it does not stack and if items overlap, add some space at the top
                    const groupHeight = (items.length > 1) ? unStackGroup(items, group, OFFSET, group.isCollapsed) : 0;
                    const isShowButton = (items.length > 1);// && (groupHeight > (items[0].height + (OFFSET * 2)));
                    const button = toggleButtonDisplay(isShowButton, group);
                }
            });
        }

        container.timeline._timeline.on("changed", () => {
            renderTimelineGroups(container);
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
    resetGroupReCalculation: function (container, groupId) {
        if (container?.timeline?._timeline?.itemSet?.groups[groupId]) {
            container.timeline._timeline.itemSet.groups[groupId].isReCalculateStack = true;
            container.timeline._timeline.itemSet.groups[groupId].isReCalculateUnStack = true;
        }
    },
    resetItemProperties: function (item, container, groupId) {
        item.stackTop = 0;
        item.unStackTop = 0;
        vcftimeline.resetGroupReCalculation(container, groupId);
    },
    revertMove: function (container, itemId, itemJson) {
        let item = container.timeline._timeline.itemSet.items[itemId];
        let itemData = item.data;
        let parsedItem = JSON.parse(itemJson);
        itemData.start = parsedItem.start;
        itemData.end = parsedItem.end;

        container.timeline._timeline.itemSet.items[itemId].left =
            container.timeline._timeline.itemSet.items[itemId].conversion.toScreen(moment(itemData.start));
        container.timeline._timeline.itemsData.update(itemData);
        if (item && itemData) {
            vcftimeline.resetItemProperties(item, container, itemData.group);
        }
    },

    removeItem: function (container, itemId) {
       let item = container.timeline._timeline.itemSet.items[itemId];
       let itemData = item.data;
       if (item && itemData) {
           vcftimeline.resetItemProperties(item, container, itemData.group);
       }
       container.timeline._timeline.itemsData.remove(itemId);
    },

    updateItemContent: function (container, itemId, newContent) {
        let item = container.timeline._timeline.itemSet.items[itemId];
        let itemData = item.data;
        itemData.content = newContent;
        if (item && itemData) {
           vcftimeline.resetItemProperties(item, container, itemData.group);
        }
        container.timeline._timeline.itemsData.update(itemData);
    },

    updateItemGroup: function (container, itemId, groupId) {
        let item = container.timeline._timeline.itemSet.items[itemId];
        if(item)
        {
            let itemData = item.data;
            if (item && itemData) {
               vcftimeline.resetItemProperties(item, container, itemData.group);
            }
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