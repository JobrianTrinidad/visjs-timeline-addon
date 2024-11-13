package com.vaadin.componentfactory.timeline.model;

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

import com.vaadin.flow.component.Tag;
import elemental.json.Json;
import elemental.json.JsonObject;
import org.apache.commons.lang3.StringUtils;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Representation of a timeline item.
 */
@Tag("ItemGroup")
public class ItemGroup {

    private static final String SUBGROUP_ORDER_FUNCTION = "function (a,b) {return a.subgroupOrder - b.subgroupOrder;}";

    private int groupId;

    private String content;

    private int treeLevel = 1;

    private String nestedGroups;

    private boolean visible;
    private boolean subgroupStack = false;
    private String className = "ig-group";

    private boolean isItemsSelected;

    private Map<String, Boolean> subgroupStackMap = new HashMap<>();

    private String subgroupOrder;

    public ItemGroup() {
    }

    public ItemGroup(int groupId, String content, String nestedGroups, boolean visible, int treeLevel, String className) {
        this.setId(groupId);
        this.setContent(content);
        this.setNestedGroups(nestedGroups);
        this.setVisible(visible);
        this.setTreeLevel(treeLevel);
        this.setClassName(className);
    }

    public ItemGroup(int groupId, String content, String nestedGroups, boolean visible, int treeLevel) {
        this.setId(groupId);
        this.setContent(content);
        this.setNestedGroups(nestedGroups);
        this.setVisible(visible);
        this.setTreeLevel(treeLevel);
    }

    public ItemGroup(int groupId, String content, boolean visible, int treeLevel) {
        this.setId(groupId);
        this.setContent(content);
        this.setNestedGroups(null);
        this.setVisible(visible);
        this.setTreeLevel(treeLevel);
    }

    public int getGroupId() {
        return groupId;
    }

    public void setId(int groupId) {
        this.groupId = groupId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getNestedGroups() {
        return nestedGroups;
    }

    public void setNestedGroups(String nestedGroups) {
        this.nestedGroups = nestedGroups;
    }

    public boolean isVisible() {
        return visible;
    }

    public void setVisible(boolean visible) {
        this.visible = visible;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    @Override
    public int hashCode() {
        return Objects.hash(groupId);
    }

    public int getTreeLevel() {
        return treeLevel;
    }

    public void setTreeLevel(int treeLevel) {
        this.treeLevel = treeLevel;
    }

    public boolean isSubgroupStack() {
        return subgroupStack;
    }

    public void setSubgroupStack(boolean subgroupStack) {
        this.subgroupStack = subgroupStack;
    }

    public Map<String, Boolean> getSubgroupStackMap() {
        return subgroupStackMap;
    }

    public void setSubgroupStackMap(Map<String, Boolean> subgroupStackMap) {
        this.subgroupStackMap = subgroupStackMap;
    }


    public void addStackSubgroup(String name, boolean stackValue) {
        subgroupStackMap.put(name, stackValue);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null) return false;
        if (getClass() != obj.getClass()) return false;
        ItemGroup other = (ItemGroup) obj;
        return Objects.equals(groupId, other.groupId);
    }

    public String toJSON() {
        JsonObject js = Json.createObject();
        Optional.of(getGroupId()).ifPresent(v -> js.put("groupId", v));
        Optional.ofNullable(getContent()).ifPresent(v -> js.put("content", v));
        Optional.of(getTreeLevel()).ifPresent(v -> js.put("treeLevel", v));
        Optional.ofNullable(getNestedGroups()).ifPresent(v -> js.put("nestedGroups", v));
        Optional.of(isVisible()).ifPresent(v -> js.put("visible", v));
        Optional.of(isSubgroupStack()).ifPresent(v -> js.put("subgroupStack", v));
        if (!getSubgroupStackMap().isEmpty()) {
            JsonObject subgroupStackBuilder = Json.createObject();
            getSubgroupStackMap().forEach(subgroupStackBuilder::put); // adds each entry in the map to the builder
            js.put("subgroupStack", subgroupStackBuilder);
            js.put("subgroupOrder", StringUtils.isEmpty(getSubgroupOrder()) ? SUBGROUP_ORDER_FUNCTION : getSubgroupOrder());
        }
        Optional.ofNullable(getClassName()).ifPresent(v -> js.put("className", v));

        return js.toJson();
    }

    public boolean isItemsSelected() {
        return isItemsSelected;
    }

    public void setItemsSelected(boolean itemsSelected) {
        isItemsSelected = itemsSelected;
    }

    public String getSubgroupOrder() {
        return subgroupOrder;
    }

    public void setSubgroupOrder(String subgroupOrder) {
        this.subgroupOrder = subgroupOrder;
    }
}
