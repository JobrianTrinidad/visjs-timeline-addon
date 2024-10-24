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

import java.util.Map;

/**
 * The ContextFormEventHandler abstract class defines the contract for handling various form-related
 * events, such as input changes, button clicks, content parsing, and form submissions.
 * Implementations of this interface provide specific behavior for these events in a form context.
 */
public abstract class ContextFormEventHandler {

    protected Timeline timeline;
    protected String htmlContent;
    protected String htmlStyle;

    protected boolean isSubmitForm = true;

    public ContextFormEventHandler() {
        super();
    }

    public ContextFormEventHandler(String htmlContent, String htmlStyle, boolean isSubmitForm) {
        this.htmlContent = htmlContent;
        this.htmlStyle = htmlStyle;
        this.isSubmitForm = isSubmitForm;
    }

    public Timeline getTimeline() {
        return timeline;
    }

    public void setTimeline(Timeline timeline) {
        this.timeline = timeline;
    }


    public String getHtmlContent() {
        return htmlContent;
    }

    public void setHtmlContent(String htmlContent) {
        this.htmlContent = htmlContent;
    }

    public String getHtmlStyle() {
        return htmlStyle;
    }

    public void setHtmlStyle(String htmlStyle) {
        this.htmlStyle = htmlStyle;
    }

    public boolean isSubmitForm() {
        return isSubmitForm;
    }

    public void setSubmitForm(boolean submitForm) {
        isSubmitForm = submitForm;
    }

    /**
     * Handles the change event of a form input field.
     * This method is triggered when a form input (such as a text field, checkbox, or dropdown)
     * changes its value. The method provides the key (usually the input's name or id) and the
     * new value after the change.
     *
     * @param key    the identifier of the input field (usually the input name or key).
     * @param value  the new value of the input field after the change event.
     * @param itemId the identifier of the item being processed in the form.
     */
    public abstract void onInputChange(String key, String value, int itemId);


    /**
     * Handles a button click event.
     * This method is invoked when a button within the form is clicked. It provides the key
     * (usually the button's name or id) and the itemId for which the button click is associated.
     *
     * @param key    the identifier of the button that was clicked.
     * @param itemId the identifier of the item being processed in the form.
     */
    public abstract void onClickButton(String key, int itemId);

    /**
     * Parses content related to a specific item.
     * This method is used to process and return parsed content for display or further
     * manipulation. It is especially useful when content needs to be dynamically customized
     * for a specific item.
     *
     * @param content the raw content to be parsed.
     * @param itemId  the identifier of the item for which the content needs to be parsed.
     * @return the parsed content as a String.
     */
    public abstract String parsedContent(String content, int itemId);

    /**
     * Handles the submission of form data.
     * This method is triggered when a form is submitted. It provides a map containing the
     * form's data, where each key represents a form field name and each value represents
     * the corresponding field value. The itemId is also provided to identify the associated item.
     *
     * @param formDataMap a map containing form data where keys represent field names
     *                    and values represent the corresponding field values.
     * @param itemId      the identifier of the item being processed in the form.
     */
    public abstract void onSubmitForm(Map<String, Object> formDataMap, int itemId);

}
