package com.vaadin.componentfactory.timeline.util;

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

import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TimelineUtil {

    public static LocalDateTime convertLocalDateTime(String stringDate) {
        return LocalDateTime.parse(stringDate, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }

    public static LocalDateTime convertDateTime(String milliSeconds) {
        if (milliSeconds == null)
            return null;
        long timestamp = Double.valueOf(milliSeconds).longValue();
        Instant date = Instant.ofEpochMilli(timestamp);
        return LocalDateTime.ofInstant(date, ZoneId.systemDefault());
    }

    public static LocalDateTime convertDateTimeFromString(String strDateTime) {
        if (strDateTime == null)
            return null;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        return LocalDateTime.parse(strDateTime, formatter);
    }

    /**
     * Formats a LocalDateTime object into a string in the format "yyyy-MM-dd HH:mm".
     *
     * @param date the LocalDateTime to be formatted
     * @return a string representing the formatted date and time
     */
    public static String formatDatesTime(LocalDateTime date) {
        return date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
    }

    /**
     * Formats a LocalDate object into a string in the format "yyyy-MM-dd".
     *
     * @param date the LocalDate to be formatted
     * @return a string representing the formatted date
     */
    public static String formatDates(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }

    /**
     * Formats a Double value to a string with 2 decimal places.
     *
     * @param value the Double to be formatted
     * @return a string representing the formatted double value
     */
    public static String formatDouble(Double value) {
        return String.format("%.2f", value);
    }

    /**
     * Converts a Boolean value into a "Yes" or "No" string.
     *
     * @param value the Boolean to be converted
     * @return "Yes" if the value is true, "No" otherwise
     */
    public static String formatBoolean(Boolean value) {
        return value ? "Yes" : "No";
    }

    /**
     * Parses a string that contains expressions enclosed in curly braces and replaces them with values
     * from the context or a fallback if no value is found in the context.
     *
     * @param input the string containing expressions to parse
     * @param context the object context from which to evaluate expressions
     * @param fallbackCallback a callback function to provide a fallback value if an expression is not found in the context
     * @return the input string with the expressions replaced by their evaluated values
     */
    public static String parseString(String input, Object context, Function<String, Object> fallbackCallback) {
        Pattern pattern = Pattern.compile("\\{([^}]+)}");
        Matcher matcher = pattern.matcher(input);
        StringBuilder result = new StringBuilder();

        ExpressionParser parser = new SpelExpressionParser();
        while (matcher.find()) {
            String expression = matcher.group(1);
            Object value = null;
            try {
                // Try to get the value from the context
                value = parser.parseExpression(expression).getValue(context);
            } catch (Exception e) {
                // Handle exceptions if expression parsing or evaluation fails
            }
            // If value is null, try the fallback callback
            if (value == null && fallbackCallback != null) {
                value = fallbackCallback.apply(expression);
            }

            // Handle different types with custom formatting
            String replacement;
            if (value instanceof LocalDateTime) {
                replacement = TimelineUtil.formatDatesTime((LocalDateTime) value);
            } else if (value instanceof LocalDate) {
                replacement = TimelineUtil.formatDates((LocalDate) value);
            } else if (value instanceof Double) {
                replacement = TimelineUtil.formatDouble((Double) value);
            } else if (value instanceof Boolean) {
                replacement = ((Boolean) value) ? "checked" : "";
            } else {
                replacement = value != null ? value.toString() : "";
            }

            matcher.appendReplacement(result, replacement);
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
