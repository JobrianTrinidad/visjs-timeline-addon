package com.vaadin.componentfactory.timeline;

import com.vaadin.componentfactory.timeline.model.ItemGroup;
import com.vaadin.componentfactory.timeline.model.Item;
import com.vaadin.flow.component.button.Button;
import com.vaadin.flow.component.combobox.ComboBox;
import com.vaadin.flow.component.datetimepicker.DateTimePicker;
import com.vaadin.flow.component.html.Div;
import com.vaadin.flow.component.html.Paragraph;
import com.vaadin.flow.component.notification.Notification;
import com.vaadin.flow.component.orderedlayout.HorizontalLayout;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.component.textfield.TextField;
import com.vaadin.flow.data.renderer.LitRenderer;
import com.vaadin.flow.data.renderer.Renderer;
import com.vaadin.flow.router.Route;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

@Route(value = "group-items", layout = MainLayout.class)
public class ItemGroupsExample extends Div {

    private Button addItemButton;
    private Item newItem;

    public ItemGroupsExample() {
        // for logging changes
        VerticalLayout log = new VerticalLayout();

        List<Item> items = getItems();
        List<ItemGroup> itemGroups = getGroupItems();

        Timeline timeline = new Timeline(items, itemGroups);

        // setting timeline range
        timeline.setTimelineRange(
                LocalDateTime.of(2023, 1, 1, 00, 00, 00), LocalDateTime.of(2023, 9, 25, 00, 00, 00));

        timeline.setMultiselect(true);
        timeline.setStack(true);
        boolean bAutoZoom = false;

        // Select Item
        TextField tfSelected = new TextField();

        VerticalLayout selectRangeLayout = getSelectRangeLayout(timeline, bAutoZoom, itemGroups);
        HorizontalLayout zoomOptionsLayout = getSelectItemAndZoomOptionLayout(timeline, items, tfSelected, bAutoZoom);
        VerticalLayout selectHighlightRangeLayout = getSelectHighlightRangeLayout(timeline, bAutoZoom);
//        Checkbox focusSelection = new Checkbox("Focus on selection", event -> {
//            timeline.onSetFocusSelectionByDragAndDrop(timeline, event.getValue());
//        });

        add(selectRangeLayout, zoomOptionsLayout, selectHighlightRangeLayout, timeline, log);
    }

    private boolean cancelMove(List<Item> items) {
        return items.stream().anyMatch(i -> i.getId().equals("0") || i.getId().equals("3"));
    }

    private VerticalLayout getSelectHighlightRangeLayout(Timeline timeline, boolean bAutoZoom) {
        VerticalLayout selectRangeLayout = new VerticalLayout();
        selectRangeLayout.setSpacing(false);
        Paragraph p = new Paragraph("Select range for new focus: ");
        p.getElement().getStyle().set("margin-bottom", "5px");
        selectRangeLayout.add(p);

        DateTimePicker startRange = new DateTimePicker("Focus start date: ");
        startRange.setMin(LocalDateTime.of(2023, 1, 10, 00, 00, 00));
        startRange.setMax(LocalDateTime.of(2023, 8, 22, 00, 00, 00));

        DateTimePicker endRange = new DateTimePicker("Focus end date: ");
        endRange.setMin(LocalDateTime.of(2023, 1, 10, 00, 00, 00));
        endRange.setMax(LocalDateTime.of(2023, 8, 22, 00, 00, 00));

        startRange.addValueChangeListener(
                e -> {
                    timeline.setHighlightStart(startRange.getValue());
                    this.createHighLightRange(timeline, startRange.getValue(), endRange.getValue(), startRange, endRange);
                });
        endRange.addValueChangeListener(
                e -> {
                    timeline.setHighlightEnd(endRange.getValue());
                    this.createHighLightRange(timeline, startRange.getValue(), endRange.getValue(), startRange, endRange);
                });


        HorizontalLayout horizontalLayout = new HorizontalLayout();
        horizontalLayout.add(startRange, endRange);
        selectRangeLayout.add(horizontalLayout);
        return selectRangeLayout;
    }

    private void createHighLightRange(Timeline timeline, LocalDateTime start, LocalDateTime end, DateTimePicker startRange, DateTimePicker endRange) {
        if (start != null && end != null) {
            if (start.isBefore(end)) {
                timeline.onSetHighlightRange(timeline, start, end);
                startRange.clear();
                endRange.clear();
            } else {
                Notification.show("End date should be after start date", 5000, Notification.Position.MIDDLE);
            }
        } else {
        }
    }

    private VerticalLayout getSelectRangeLayout(Timeline timeline, boolean bAutoZoom, List<ItemGroup> itemGroups) {
        VerticalLayout selectRangeLayout = new VerticalLayout();
        selectRangeLayout.setSpacing(false);
        Paragraph p = new Paragraph("Select range for new item: ");
        p.getElement().getStyle().set("margin-bottom", "5px");
        selectRangeLayout.add(p);

        ComboBox<ItemGroup> comboBox = new ComboBox<>("Group Name");
        comboBox.setItems(itemGroups);
        comboBox.setItemLabelGenerator(ItemGroup::getContent);
        comboBox.setRenderer(createRenderer());
        comboBox.setValue(itemGroups.get(0));
        comboBox.setAllowCustomValue(true);

        DateTimePicker datePicker1 = new DateTimePicker("Item start date: ");
        datePicker1.setMin(LocalDateTime.of(2023, 1, 10, 00, 00, 00));
        datePicker1.setMax(LocalDateTime.of(2023, 8, 22, 00, 00, 00));

        DateTimePicker datePicker2 = new DateTimePicker("Item end date: ");
        datePicker2.setMin(LocalDateTime.of(2023, 1, 10, 00, 00, 00));
        datePicker2.setMax(LocalDateTime.of(2023, 8, 22, 00, 00, 00));

        datePicker1.addValueChangeListener(
                e -> {
                    ItemGroup selectedItemGroup = comboBox.getValue();
                    newItem = createNewItem(datePicker1.getValue(), datePicker2.getValue(), selectedItemGroup.getGroupId());
                });
        datePicker2.addValueChangeListener(
                e -> {
                    ItemGroup selectedItemGroup = comboBox.getValue();
                    newItem = createNewItem(datePicker1.getValue(), datePicker2.getValue(), selectedItemGroup.getGroupId());
                });

        comboBox.addValueChangeListener(
                e -> {
                    ItemGroup selectedItemGroup = comboBox.getValue();
                    newItem = createNewItem(datePicker1.getValue(), datePicker2.getValue(), selectedItemGroup.getGroupId());
                });

        HorizontalLayout horizontalLayout = new HorizontalLayout();
        horizontalLayout.add(datePicker1, datePicker2, comboBox);

        addItemButton =
                new Button(
                        "Add Item",
                        e -> {
                            timeline.addItem(newItem, bAutoZoom);
                            newItem = null;
                            datePicker1.clear();
                            datePicker2.clear();
                        });
        addItemButton.setDisableOnClick(true);
        addItemButton.setEnabled(false);

        selectRangeLayout.add(horizontalLayout, addItemButton);
        return selectRangeLayout;
    }

    private HorizontalLayout getSelectItemAndZoomOptionLayout(Timeline timeline, List<Item> items, TextField textField, boolean bAutoZoom) {
        VerticalLayout selectLayout = new VerticalLayout();
        Button setSelectBtn = new Button("Select Item", e -> {
            timeline.setSelectItem(textField.getValue());
        });
        selectLayout.add(textField, setSelectBtn);

        HorizontalLayout zoomOptionsLayout = new HorizontalLayout();
        zoomOptionsLayout.setMargin(true);
        Button oneDay = new Button("1 day", e -> timeline.setZoomOption(1));
        Button threeDays = new Button("3 days", e -> timeline.setZoomOption(3));
        Button fiveDays = new Button("5 days", e -> timeline.setZoomOption(5));

        zoomOptionsLayout.add(oneDay, threeDays, fiveDays, selectLayout);

        timeline.addItemSelectListener(
                e -> {
                    timeline.onSelectItem(e.getTimeline(), e.getItemId(), bAutoZoom);
                    textField.setValue(e.getItemId());
                }
        );

        timeline.addGroupItemClickListener(e -> {
            String temp = "";
            for (Item item : items) {
                if (Integer.parseInt(item.getGroup()) == Integer.parseInt(e.getGroupId())) {
                    if (!temp.equals(""))
                        temp += "," + item.getId();
                    else
                        temp += item.getId();

                }
            }
            e.getTimeline().onSelectItem(e.getTimeline(), temp, false);
        });


        return zoomOptionsLayout;
    }

    private List<Item> getItems() {
        Item item1 = new Item(
                LocalDateTime.of(2023, 8, 11, 2, 30, 00),
                LocalDateTime.of(2023, 8, 11, 7, 00, 00),
                "Item 1", 1);
        item1.setId("0");
        item1.setEditable(true);
        item1.setUpdateTime(true);
        item1.setClassName("red");

        Item item2 = new Item(
                LocalDateTime.of(2023, 8, 13, 0, 00, 00),
                LocalDateTime.of(2023, 8, 13, 12, 00, 00),
                "Item 2", 6);
        item2.setId("1");
        item2.setEditable(true);
        item2.setUpdateTime(true);
        item2.setClassName("bg-warning");

        Item item3 = new Item(
                LocalDateTime.of(2023, 8, 14, 2, 30, 00),
                LocalDateTime.of(2023, 8, 15, 1, 00, 00),
                "Item 3", 100);
        item3.setId("2");
        item3.setEditable(true);
        item3.setUpdateTime(true);
        item3.setClassName("bg-warning");

        Item item4 = new Item(
                LocalDateTime.of(2023, 8, 16, 1, 30, 00),
                LocalDateTime.of(2023, 8, 17, 1, 00, 00),
                "Item 4", 106);
        item4.setId("3");
        item4.setEditable(true);
        item4.setUpdateTime(true);
        item4.setClassName("bg-warning");

        Item item5 = new Item(
                LocalDateTime.of(2023, 8, 11, 1, 30, 00),
                LocalDateTime.of(2023, 8, 17, 1, 00, 00),
                "Item 5", 1);
        item5.setId("4");
        item5.setEditable(true);
        item5.setUpdateTime(true);
        item5.setClassName("bg-warning");

        List<Item> items = Arrays.asList(item1, item2, item3, item4, item5);
        return items;
    }

    private List<ItemGroup> getGroupItems() {

        ItemGroup itemGroup1243 = new ItemGroup(1243, "Level 3 1243", true, 3);
        ItemGroup itemGroup1525 = new ItemGroup(1525, "Level 3 1525", true, 3);
        ItemGroup itemGroup1624 = new ItemGroup(1624, "Level 3 1624", true, 3);
        ItemGroup itemGroup2076 = new ItemGroup(2076, "Level 3 2076", true, 3);
        ItemGroup itemGroup1345 = new ItemGroup(1345, "Level 3 1345", true, 3);
        ItemGroup itemGroup2078 = new ItemGroup(2078, "Level 3 2078", true, 3);
        ItemGroup itemGroup1826 = new ItemGroup(1826, "Level 3 1826", true, 3);
        ItemGroup itemGroup2107 = new ItemGroup(2107, "Level 3 2107", true, 3);
        ItemGroup itemGroup10 = new ItemGroup(10, "Group 10", "1,2,3,4,5,6", true, 1);
        ItemGroup itemGroup1 = new ItemGroup(1, "North America", "1243,1525,1624,1345,2078,1826,2076,2107",
                true, 2);
        ItemGroup itemGroup2 = new ItemGroup(2, "Latin America", true, 2);
        ItemGroup itemGroup3 = new ItemGroup(3, "Europe", true, 2);
        ItemGroup itemGroup4 = new ItemGroup(4, "Asia", true, 2);
        ItemGroup itemGroup5 = new ItemGroup(5, "Oceania", true, 2);
        ItemGroup itemGroup6 = new ItemGroup(6, "Africa", true, 2);
        ItemGroup itemGroup100 = new ItemGroup(100, "Group 100", "101, 102, 103, 104, 105, 106", true, 1);
        ItemGroup itemGroup101 = new ItemGroup(101, "North America", true, 2);
        ItemGroup itemGroup102 = new ItemGroup(102, "Latin America", true, 2);
        ItemGroup itemGroup103 = new ItemGroup(103, "Europe", true, 2);
        ItemGroup itemGroup104 = new ItemGroup(104, "Asia", true, 2);
        ItemGroup itemGroup105 = new ItemGroup(105, "Oceania", true, 2);
        ItemGroup itemGroup106 = new ItemGroup(106, "Africa", true, 2);

        List<ItemGroup> itemGroups = Arrays.asList(itemGroup10, itemGroup1, itemGroup1243, itemGroup1525, itemGroup1624, itemGroup2076,
                itemGroup1345, itemGroup2078, itemGroup1826, itemGroup2107,
                itemGroup2, itemGroup3, itemGroup4, itemGroup5, itemGroup6, itemGroup100, itemGroup101,
                itemGroup102, itemGroup103, itemGroup104, itemGroup105, itemGroup106);
        return itemGroups;
    }

    private String formatDates(LocalDateTime date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
    }

    private Item createNewItem(LocalDateTime start, LocalDateTime end, int groupID) {
        if (start != null && end != null) {
            if (start.isBefore(end)) {
                addItemButton.setEnabled(true);
                return new Item(start, end, groupID);
            } else {
                Notification.show("End date should be after start date", 5000, Notification.Position.MIDDLE);
                return null;
            }
        } else {
            addItemButton.setEnabled(false);
            return null;
        }
    }

    private Renderer<ItemGroup> createRenderer() {
        StringBuilder tpl = new StringBuilder();
        tpl.append("<span style= \"font-weight: ${item.width}; font-size: ${item.fontsize}\">${item.content}</span>");

        return LitRenderer.<ItemGroup>of(tpl.toString())
                .withProperty("width", itemGroup -> {
                    if (itemGroup.getTreeLevel() == 1)
                        return "bolder";
                    else if (itemGroup.getTreeLevel() == 2)
                        return "bold";
                    else
                        return "normal";
                })
                .withProperty("fontsize", itemGroup -> {
                    if (itemGroup.getTreeLevel() == 1)
                        return "1rem";
                    else if (itemGroup.getTreeLevel() == 2)
                        return "0.9rem";
                    else
                        return "0.8rem";
                })
                .withProperty("content", ItemGroup::getContent);
    }
}