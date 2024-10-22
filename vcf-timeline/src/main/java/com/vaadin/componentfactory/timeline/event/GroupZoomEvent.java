package com.vaadin.componentfactory.timeline.event;

/*-
 * #%L
 * Timeline for Flow
 * %%
 * Copyright (C) 2021 - 2024 Vaadin Ltd
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

import com.vaadin.componentfactory.timeline.Timeline;
import com.vaadin.flow.component.ComponentEvent;
import com.vaadin.flow.component.html.Div;

/**
 * Event is thrown when a group Zoom is call
 */
public class GroupZoomEvent extends ComponentEvent<Div> {

    private int groupId;

    private Timeline source;

    public GroupZoomEvent(Timeline source, int groupId, boolean fromClient) {
        super(source, fromClient);
        this.groupId = groupId;
        this.source = source;
    }

    public int getGroupId() {
        return groupId;
    }

    public Timeline getTimeline() {
        return (Timeline) source;
    }
}
