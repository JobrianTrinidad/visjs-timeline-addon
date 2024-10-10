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
package com.vaadin.componentfactory.timeline.event;

import com.vaadin.componentfactory.timeline.Timeline;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.html.Div;

/**
 * Event thrown when an item is resized.
 */
public class GroupItemSelectEvent extends ComponentEvent<Div> {

    private String groupId;
    private Timeline source;

    private boolean cancelled = false;

    private boolean isSelectRequest = true;

    public GroupItemSelectEvent(
            Timeline source,
            String groupId,
            boolean fromClient, boolean isSelectRequest) {
        super(source, fromClient);
        this.groupId = groupId;
        this.source = source;
        this.isSelectRequest = isSelectRequest;
    }

    public String getGroupId() {
        return groupId;
    }
    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }
    public boolean isCancelled() {
        return cancelled;
    }

    public void setCancelled(boolean cancelled) {
        this.cancelled = cancelled;
    }

    public Timeline getTimeline() {
        return (Timeline) source;
    }

    public boolean isSelectRequest() {
        return isSelectRequest;
    }

    public void setSelectRequest(boolean selectRequest) {
        isSelectRequest = selectRequest;
    }

}


