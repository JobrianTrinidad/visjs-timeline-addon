package com.vaadin.componentfactory.timeline.model;

/*-
 * #%L
 * Timeline for Flow
 * %%
 * Copyright (C) 2021 - 2025 Vaadin Ltd
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

/**
 * Defines the editable options for items in the timeline.
 */
public class EditableOptions {

    /**
     * When true, new items can be added by double-tapping.
     */
    public boolean isDoubleTapAdd = false;

    /**
     * When true, items can be dragged horizontally to update their time.
     */
    public boolean updateTime = false;

    /**
     * When true, items can be dragged from one group to another.
     */
    public boolean updateGroup = false;

    /**
     * When true, items can be deleted by tapping the delete button in the top right.
     */
    public boolean remove = false;

    /**
     * When true, these options override item-specific editable settings.
     */
    public boolean overrideItems = false;

    public EditableOptions() {
    }
}
