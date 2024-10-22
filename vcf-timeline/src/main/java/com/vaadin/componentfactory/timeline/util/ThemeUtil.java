package com.vaadin.componentfactory.timeline.util;

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

import com.vaadin.flow.component.UI;

public class ThemeUtil {

    /**
     * Adds a link element to the current UI's document head to load an external stylesheet.
     * <p>
     * This method dynamically creates a `link` element with the specified stylesheet URL and appends it to the
     * document's `head` section. The `link` element will have an `id` attribute set to the provided styleName,
     * allowing you to easily identify or modify the link later if needed.
     *
     * @param styleName the unique identifier to assign to the `id` attribute of the `link` element. This can be used
     *                  to reference or modify the stylesheet in the future.
     * @param url       the URL of the external stylesheet to be loaded into the document.
     *                  <p>
     *                  Example usage:
     *                  <pre>
     *                  {@code
     *                  setLinkStyleSheet("custom-theme", "https://example.com/styles/custom-theme.css");
     *                  }
     *                  </pre>
     */
    public static void setLinkStyleSheet(String styleName, String url) {
        UI.getCurrent().getElement().executeJs(
                "if (!document.getElementById('" + styleName + "')) {" +
                        "var link = document.createElement('link');" +
                        "link.id = '" + styleName + "';" +
                        "link.rel = 'stylesheet';" +
                        "link.href = '" + url + "';" +
                        "document.head.appendChild(link);" +
                        "}"
        );
    }
}
