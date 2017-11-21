define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/query"
], function(declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoQuery) {
    "use strict";

    return declare("DataGridKeyboardCommands.widget.DataGridKeyboardCommands", [_WidgetBase], {
        // Internal variables.
        _handles: null,
        _contextObj: null,
        _grid: null,
        _anchorRow: null,

        KEY_UP: 38,
        KEY_DOWN: 40,

        constructor: function() {
            this._handles = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._setupGrid();

            if (this._grid) {
                this._grid.connect(this._grid.domNode, "onkeydown", dojoLang.hitch(this, this._onKeyPress));
            }

            if (callback) callback();
        },

        resize: function(box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");
        },
        _setupGrid: function() {
            var nodeList = dojoQuery(".mx-name-" + this.targetGridName);
            var gridNode = nodeList ? nodeList[nodeList.length - 1] : null;
            if (gridNode) {
                this._grid = dijit.registry.byNode(gridNode);
                if (this._grid) {
                    if (!this._grid.gridSearchWidgets) {
                        this._grid.gridSearchWidgets = {};
                    }
                    this._grid.gridSearchWidgets[this.id] = this;
                } else {
                    console.log("Found a DOM node but could not find the grid widget.");
                }
            } else {
                console.log("Could not find the list node.");
            }
        },
        _onKeyPress: function(e) {
            var key = e.keyCode ? e.keyCode : e.which;
            var rowToSelect;
            var shiftKeyPressed = e.shiftKey;
            // shift is pressed and key is up or down
            if (shiftKeyPressed && (key === this.KEY_UP || key === this.KEY_DOWN)) {
                // find the anchor
                // if only one row, it's the anchor, else...
                // this._anchorRow = this._anchorRow || dojoQuery(".selected", this._grid.domNode)[0];
                var focusRow = dojoQuery(".mx-focus", this._grid.domNode)[0];
                // if the focus row is selected
                if (focusRow && dojoClass.contains(focusRow, "selected")) {
                    // find the next seelcted row
                    if (key === this.KEY_DOWN) {
                        rowToSelect = focusRow.nextSibling;
                    } else if (key === this.KEY_UP) {
                        rowToSelect = focusRow.previousSibling;
                    }
                    if (rowToSelect) {
                        this._toggleSelectedRow(focusRow, rowToSelect);
                        // remove focus from the original row
                        dojoClass.remove(focusRow, "mx-focus");
                        dojoClass.add(rowToSelect, "mx-focus");
                        // var obj = this._grid._getObjectFromNode(rowToSelect);
                        // if (obj) {
                        //     this._grid._addToSelection(obj.getGuid());
                        //     this._grid.selectRow(rowToSelect);
                        //     dojoClass.add(rowToSelect, "mx-focus");
                        //     dojoClass.remove(focusRow, "mx-focus");
                        // } else {
                        //     console.error("While selecting a row, could not find mx object related to row.");
                        // }
                    }
                }
            }
        },
        _isMacintosh: function() {
            return navigator.platform.indexOf("Mac") > -1;
        },
        _toggleSelectedRow: function(fromRow, toRow) {
            var obj;
            if (dojoClass.contains(toRow, "selected")) {
                // deselect
                obj = this._grid._getObjectFromNode(fromRow);
                this._grid._removeFromSelection(obj.getGuid());
                this._grid.deselectRow(fromRow);
                // dojoClass.remove(fromRow, "mx-focus");
            } else {
                // add
                obj = this._grid._getObjectFromNode(toRow);
                this._grid._addToSelection(obj.getGuid());
                this._grid.selectRow(toRow);
                // dojoClass.add(toRow, "mx-focus");
            }
        }
    });
});

require(["DataGridKeyboardCommands/widget/DataGridKeyboardCommands"]);