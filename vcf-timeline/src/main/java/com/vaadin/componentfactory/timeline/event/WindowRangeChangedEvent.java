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

import java.time.LocalDateTime;

public class WindowRangeChangedEvent extends ComponentEvent<Timeline> {
    private final LocalDateTime newStart;

    public LocalDateTime getNewStart() {
        return newStart;
    }

    public LocalDateTime getNewEnd() {
        return newEnd;
    }

    private final LocalDateTime newEnd;
    public WindowRangeChangedEvent(Timeline source, LocalDateTime newStart, LocalDateTime newEnd, boolean fromClient) {
        super(source, fromClient);
        this.newStart = newStart;
        this.newEnd = newEnd;
    }
}
