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
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.dialog.Dialog;
import com.vaadin.flow.component.html.Div;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import elemental.json.Json;
import elemental.json.JsonObject;
import elemental.json.JsonValue;
import org.apache.commons.lang3.ObjectUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * A custom dialog component that allows rendering dynamic HTML content with form submission support.
 * <p>
 * This dialog provides features for adding custom content, handling form submissions,
 * updating status messages, and handling input changes or button clicks within the form.
 * <p>
 * It includes an optional close button and supports dynamically updating content and styles.
 * Input fields within the content can trigger server-side events when their values are changed.
 */
public class ContextItemDialog extends Dialog {

    protected boolean isSubmitForm;
    protected int itemId;
    protected VerticalLayout vcontent;
    protected Div contentDiv;
    protected String htmlContent;
    protected String htmlStyle;

    protected Button submitBtn;
    protected ContextFormEventHandler eventHandler;

    /**
     * Constructs a ContextFormDialog.
     *
     * @param htmlContent  The HTML content to be displayed in the dialog.
     * @param htmlStyle    The custom CSS styles to be applied to the dialog content.
     * @param isSubmitForm If true, adds an "OK" button for form submission.
     */
    public ContextItemDialog(String htmlContent, String htmlStyle, boolean isSubmitForm) {
        setCloseOnOutsideClick(true);
        this.htmlContent = htmlContent;
        this.htmlStyle = htmlStyle;
        this.isSubmitForm = isSubmitForm;

        // Adds a close button to the dialog.
        Button closeButton = new Button("X", event -> close());
        closeButton.setClassName("context-dialog-close-button");
        // Styles the close button.
        closeButton.getStyle()
                .set("position", "absolute")
                .set("top", "10px")
                .set("right", "10px")
                .set("cursor", "pointer")
                .set("background", "none !important")
                .set("border", "none !important")
                .set("font-size", "20px")
                .set("color", "#ff0000 !important");

        vcontent = new VerticalLayout();
        contentDiv = new Div();
        contentDiv.setId("context-form-dialog-content");

        vcontent.add(contentDiv);
        if (isSubmitForm) {
            submitBtn = new Button("OK", event -> addProcessFormSubmitListener());
            submitBtn.setClassName("context-dialog-close-button");
            submitBtn.getStyle()
                    .set("margin-top", "5px")
                    .set("align-self", "center");
            submitBtn.setVisible(false);
            vcontent.add(submitBtn);
        }
        add(closeButton, vcontent);
    }

    /**
     * Opens the dialog and applies the provided style and input listeners.
     */
    @Override
    public void open() {
        super.open();
        if (ObjectUtils.isNotEmpty(htmlStyle)) {
            setStyle(htmlStyle);
        }
        if (eventHandler != null) {
            submitBtn.setVisible(isSubmitForm);
            addInputOnChangeListener();
            addButtonClickListener();
        }
    }

    /**
     * Sets custom styles for the dialog's content.
     *
     * @param htmlStyle The CSS styles as a string to be applied.
     */
    private void setStyle(String htmlStyle) {
        getElement().executeJs(
                "var style = document.createElement('style');" +
                        "style.type = 'text/css';" +
                        "style.innerHTML = $0; " +
                        "this.appendChild(style);", htmlStyle
        );
    }

    /**
     * Updates the content of the dialog based on the HTML content and parsed data.
     */
    private void updateContent() {
        contentDiv.getElement().setProperty("innerHTML", "");
        String contentData = htmlContent;
        if (eventHandler != null) {
            contentData = eventHandler.parsedContent(contentData, itemId);
        }
        contentDiv.getElement().setProperty("innerHTML", contentData);
    }

    /**
     * Updates the status message displayed in the status bar.
     *
     * @param message The status message to be displayed.
     */
    public void updateStatusMessage(String message) {
        Notification.show(message);
    }

    /**
     * Adds listeners for input changes in the dialog content.
     * Triggers server-side events when inputs are modified.
     */
    private void addInputOnChangeListener() {
        getElement().executeJs(
                "const content = document.getElementById('context-form-dialog-content');" +
                        "if (content) { " +
                        "   const inputs = content.querySelectorAll('input, select');" +
                        "   inputs.forEach((input, index) => {" +
                        "       const key = input.name || input.id || `input_${index}`;" +
                        "       input.addEventListener('change', () => {" +
                        "           let value;" +
                        "           if (input.type === 'checkbox') {" +
                        "               value = input.checked;" +
                        "           } else if (input.type === 'radio') {" +
                        "               value = document.querySelector(`input[name='${input.name}']:checked`).value;" +
                        "           } else if (input.tagName.toLowerCase() === 'select') {" +
                        "               value = input.options[input.selectedIndex].value;" +
                        "           } else {" +
                        "               value = input.value;" +
                        "           }" +
                        "           $0.$server.onInputChange(key, value);" +
                        "       });" +
                        "   });" +
                        "} else { " +
                        "   console.error('Modal content not found for Input OnChange.');" +
                        "} "
                , getElement());
    }

    /**
     * Adds listeners for button clicks in the dialog content.
     * Triggers server-side events when buttons are clicked.
     */
    private void addButtonClickListener() {
        getElement().executeJs(
                "const content = document.getElementById('context-form-dialog-content');" +
                        "if (content) { " +
                        "   const buttons = content.querySelectorAll('button, [class$=\"-btn\"]');" +
                        "   buttons.forEach((button, index) => {" +
                        "       const key = button.name || button.id || `button_${index}`;" +
                        "       button.addEventListener('click', () => {" +
                        "           $0.$server.onClickButton(key);" +
                        "       });" +
                        "   });" +
                        "} else { " +
                        "   console.error('Modal content not found Button Click.');" +
                        "} "
                , getElement());
    }

    /**
     * Adds listeners for form submissions.
     * Collects form data from input elements and sends it to the server as JSON.
     */
    private void addProcessFormSubmitListener() {
        getElement().executeJs(
                "const content = document.getElementById('context-form-dialog-content');" +
                        "if (content) { " +
                        "   const inputs = content.querySelectorAll('input, select');" +
                        "   let formData = {};" +
                        "   inputs.forEach((input, index) => {" +
                        "       const key = input.name || input.id || `input_${index}`;" +
                        "       let value;" +
                        "       if (input.type === 'checkbox') {" +
                        "           value = input.checked;" +
                        "       } else if (input.type === 'radio') {" +
                        "           value = document.querySelector(`input[name='${input.name}']:checked`).value;" +
                        "       } else if (input.tagName.toLowerCase() === 'select') {" +
                        "           value = input.options[input.selectedIndex].value;" +
                        "       } else {" +
                        "           value = input.value;" +
                        "       }" +
                        "       formData[key] = value;" +
                        "   });" +
                        "   const jsonFormData = JSON.stringify(formData);" +
                        "   $0.$server.onSubmitForm(jsonFormData);" +
                        "} else { " +
                        "   console.error('Modal content not found Form Submit.');" +
                        "} "
                , getElement());
    }

    /**
     * Processes form submissions received from the client-side.
     *
     * @param jsonData The form data in JSON format.
     */
    @ClientCallable
    public void onSubmitForm(String jsonData) {
        JsonObject formData = Json.parse(jsonData);
        Map<String, Object> formDataMap = new HashMap<>();
        for (String key : formData.keys()) {
            JsonValue value = formData.get(key);
            switch (value.getType()) {
                case STRING:
                    formDataMap.put(key, formData.getString(key));
                    break;
                case NUMBER:
                    formDataMap.put(key, formData.getNumber(key));
                    break;
                case BOOLEAN:
                    formDataMap.put(key, formData.getBoolean(key));
                    break;
                case NULL:
                    formDataMap.put(key, null);
                    break;
                default:
                    formDataMap.put(key, value.toString());
                    break;
            }
        }
        if (eventHandler != null) {
            eventHandler.onSubmitForm(formDataMap, itemId);
        }
        close();
    }

    /**
     * Processes button click events received from the client-side.
     *
     * @param buttonKey The key identifying which button was clicked.
     */
    @ClientCallable
    public void onClickButton(String buttonKey) {
        if (eventHandler != null) {
            eventHandler.onClickButton(buttonKey, itemId);
        }
    }

    /**
     * Processes input change events received from the client-side.
     *
     * @param inputKey   The key identifying which input was changed.
     * @param inputValue The new value of the input.
     */
    @ClientCallable
    public void onInputChange(String inputKey, String inputValue) {
        if (eventHandler != null) {
            eventHandler.onInputChange(inputKey, inputValue, itemId);
        }
    }

    /**
     * Sets the event handler for handling form submissions, button clicks, and input changes.
     *
     * @param eventHandler The event handler to be set.
     */
    public void setContextFormEventHandler(ContextFormEventHandler eventHandler) {
        this.eventHandler = eventHandler;
    }

    /**
     * Sets the item ID for identifying form data or button actions related to a specific item.
     *
     * @param itemId The item ID to be set.
     */
    public void setItemId(int itemId) {
        this.itemId = itemId;
        updateContent();
    }
}

