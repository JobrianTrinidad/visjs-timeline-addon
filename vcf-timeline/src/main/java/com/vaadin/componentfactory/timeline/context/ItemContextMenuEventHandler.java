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

import com.vaadin.componentfactory.timeline.Timeline;
import com.vaadin.componentfactory.timeline.model.ItemGroup;

import java.util.List;
import java.util.Optional;

/**
 * Handles the context menu interactions for the timeline component in a Vaadin application.
 * This class is responsible for loading and displaying context menu options based on the selected
 * group or item within the timeline. It supports selecting and deselecting items within a group.
 * <p>
 * Example usage:
 * <pre>
 *     TimeLineContextHandler handler = new TimeLineContextHandler(timeline);
 *     handler.loadGroupItemsContextMenu(100, 200, selectedGroupID); // Show context menu for a group
 * </pre>
 */
public class ItemContextMenuEventHandler {

    /**
     * The context menu instance used to display options.
     */
    protected ContextMenu contextMenu;

    /**
     * The timeline component being managed.
     */
    protected Timeline timeline;

    /**
     * A dialog used for displaying custom context form content.
     */
    protected ContextItemDialog dialog;

    /**
     * Constructs a new TimeLineContextHandler with the specified timeline.
     */
    public ItemContextMenuEventHandler() {
        contextMenu = new ContextMenu();
    }

    /**
     * Returns the timeline associated with this handler.
     *
     * @return the timeline instance
     */
    public Timeline getTimeline() {
        return timeline;
    }

    /**
     * Sets the timeline for this handler.
     *
     * @param timeline the new timeline to be associated with this handler
     */
    public void setTimeline(Timeline timeline) {
        this.timeline = timeline;
    }

    /**
     * Loads and displays the context menu for a group in the timeline.
     *
     * @param left            the x-coordinate (in pixels) from the left edge of the screen where the menu should appear
     * @param top             the y-coordinate (in pixels) from the top edge of the screen where the menu should appear
     * @param selectedGroupID the ID of the selected group in the timeline
     */
    protected void loadGroupItemsContextMenu(int left, int top, int selectedGroupID) {
        if (selectedGroupID < 0) {
            return;
        }

        List<ItemGroup> itemGroups = timeline.getItemGroups();
        Optional<ItemGroup> optionalGroupItems = itemGroups.stream()
                .filter(itemGroup -> itemGroup != null && itemGroup.getGroupId() == selectedGroupID)
                .findFirst();
        if (optionalGroupItems.isPresent()) {
            // If the group is currently selected, a "De-Select Item" option is shown; otherwise, a "Select Item" option is provided.
            ItemGroup groupItems = optionalGroupItems.get();
            if (groupItems.isItemsSelected()) {
                ContextMenuItem deSelectOption = new ContextMenuItem("las la-check-square", "De-Select Item", event -> {
                    groupItems.setItemsSelected(false);
                    timeline.onDeselectItemsInGroup(selectedGroupID);
                    contextMenu.hideContextMenu();
                });
                contextMenu.add(deSelectOption);
            } else {
                ContextMenuItem selectOption = new ContextMenuItem("las la-stop", "Select Item", event -> {
                    groupItems.setItemsSelected(true);
                    timeline.onSelectItemsInGroup(selectedGroupID);
                    contextMenu.hideContextMenu();
                });
                contextMenu.add(selectOption);
            }

            ContextMenuItem zoomOption = new ContextMenuItem("las la-search", "Zoom Item", event -> {
                timeline.onZoomGroup(selectedGroupID);
                contextMenu.hideContextMenu();
            });
            contextMenu.add(zoomOption);
            contextMenu.showContextMenu(left, top);
        } else {
            contextMenu.hideContextMenu();
        }
    }

    /**
     * Loads the context menu for individual items in the timeline.
     *
     * @param left           the x-coordinate (in pixels) from the left edge of the screen where the menu should appear
     * @param top            the y-coordinate (in pixels) from the top edge of the screen where the menu should appear
     * @param selectedItemID the ID of the selected item in the timeline
     */
    protected void loadItemsContextMenu(int left, int top, int selectedItemID) {
        if (dialog != null) {
            dialog.setItemId(selectedItemID);
            dialog.open();
        }
    }

    /**
     * Loads the context menu based on the selected component type within the timeline.
     * This method is currently not implemented but can be customized to handle different
     * component types in the context menu.
     *
     * @param left           the x-coordinate (in pixels) from the left edge of the screen where the menu should appear
     * @param top            the y-coordinate (in pixels) from the top edge of the screen where the menu should appear
     * @param selectedCompID the ID of the selected component
     * @param componentType  the type of component selected (e.g., "group", "item")
     */
    public void loadContextMenu(int left, int top, int selectedCompID, String componentType) {
        // Clear existing menu options
        contextMenu.removeAll();
        contextMenu.hideContextMenu();

        if (componentType.equalsIgnoreCase("Group")) {
            loadGroupItemsContextMenu(left, top, selectedCompID);
        } else if (componentType.equalsIgnoreCase("Item")) {
            loadItemsContextMenu(left, top, selectedCompID);
        }
        // Implementation to be added for component-type-specific context menu
    }

    /**
     * Adds a custom context form to the timeline item with specified HTML content, style,
     * and options to show a submit button and status bar. This method allows interaction with
     * a form event handler for handling form events.
     *
     * @param htmlContent             the HTML content to display in the form
     * @param htmlStyle               the CSS style to apply to the form
     * @param isSubmitForm            whether the form includes a submit button
     * @param contextFormEventHandler the event handler for managing form events
     */
    public void addContextItemDialog(String htmlContent, String htmlStyle, boolean isSubmitForm, ContextFormEventHandler contextFormEventHandler) {
        dialog = new ContextItemDialog(htmlContent, htmlStyle, isSubmitForm);
        dialog.setContextFormEventHandler(contextFormEventHandler);
    }
}
