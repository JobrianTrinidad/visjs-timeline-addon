package com.vaadin.componentfactory.timeline.context;

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

import com.vaadin.componentfactory.timeline.util.ThemeUtil;
import com.vaadin.flow.component.ClientCallable;
import com.vaadin.flow.component.UI;
import com.vaadin.flow.component.html.Div;

/**
 * A custom context menu component for Vaadin applications.
 * The context menu is implemented as a div element with absolute positioning,
 * which can be shown or hidden at specified screen coordinates.
 * <p>
 * This component allows the addition of a custom stylesheet for icons using the Line Awesome icon set.
 * <p>
 * Example usage:
 * <pre>
 *     ContextMenu contextMenu = new ContextMenu();
 *     contextMenu.showContextMenu(100, 200); // Show at (100px, 200px)
 *     contextMenu.hideContextMenu();         // Hide the context menu
 * </pre>
 * <p>
 * The context menu can be styled using CSS and can contain other UI components.
 */
public class ContextMenu extends Div {

    /**
     * Constructs a new ContextMenu instance and initializes its style.
     * The menu is initially hidden and styled to appear as a floating box with a white background,
     * padding, and border. A stylesheet for Line Awesome icons is also loaded dynamically.
     */
    public ContextMenu() {
        setId("custom-context-menu");
        getStyle().set("position", "absolute")
                .set("zIndex", "1000")
                .set("background", "#fff")
                .set("border", "1px solid #ccc")
                .set("padding", "5px")
                .set("display", "none");
        UI.getCurrent().getElement().appendChild(getElement());
        // TODO do we keep line-awesome?
        ThemeUtil.setLinkStyleSheet("line-awesome", "https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css");
        this.getElement().executeJs(" document.addEventListener('click', function(event) {" +
                "       $0.$server.hideContextMenu();" +
                "   }); ", this.getElement());
    }

    /**
     * Hides the context menu by setting its display style to "none".
     * This method can be called to programmatically hide the context menu when not in use.
     */
    @ClientCallable
    public void hideContextMenu() {
        getStyle().set("display", "none");
    }

    /**
     * Shows the context menu at the specified screen coordinates.
     *
     * @param left the x-coordinate (in pixels) from the left edge of the screen where the menu should appear
     * @param top  the y-coordinate (in pixels) from the top edge of the screen where the menu should appear
     */
    public void showContextMenu(int left, int top) {
        getStyle().set("left", left + "px");
        getStyle().set("top", top + "px");
        getStyle().set("display", "block");
    }
}
