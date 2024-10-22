package com.vaadin.componentfactory.timeline.context;

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

import com.vaadin.flow.component.ClickEvent;
import com.vaadin.flow.component.ComponentEventListener;
import com.vaadin.flow.component.Html;
import com.vaadin.flow.component.html.Div;
import com.vaadin.flow.component.html.Span;

/**
 * A custom context menu option component for Vaadin applications.
 * The component consists of an icon and a label, both rendered inside a div element.
 * It supports adding a click listener to handle user interactions.
 *
 * This component uses Line Awesome icons, and the icon class is dynamically generated
 * based on the provided icon name. A click event listener can be attached to handle
 * server-side actions when the option is clicked.
 *
 * Example usage:
 * <pre>
 *     ContextOption option = new ContextOption("edit", "Edit", event -> {
 *         // Handle the click event here
 *     });
 * </pre>
 *
 * The icon and label are displayed inline, and the entire option is styled with pointer
 * cursor and padding for a clickable appearance.
 */
public class ContextMenuItem extends Div {

    /**
     * Constructs a new ContextOption instance with an icon, label, and click listener.
     *
     * @param iconClass the CSS class name for the icon to be displayed (Line Awesome icon class, e.g., "edit" for edit icon)
     * @param label the text label for the option
     * @param clickListener the event listener that will be triggered when the option is clicked
     */
    public ContextMenuItem(String iconClass, String label, ComponentEventListener<ClickEvent<Div>> clickListener) {

        // Create the icon using the specified iconClass (Line Awesome icon)
        Html icon = new Html("<i class='" + iconClass + "'></i>");
        icon.getStyle().set("padding-right", "5px");
        // Create the text span with the provided label
        Span text = new Span(label);

        // Set styling for the option (cursor pointer and padding)
        this.getStyle().set("cursor", "pointer").set("padding", "5px");

        // Add the icon and text components to this Div
        add(icon, text);

        // Add the click listener that triggers the specified server-side action
        addClickListener(clickListener);
    }
}

