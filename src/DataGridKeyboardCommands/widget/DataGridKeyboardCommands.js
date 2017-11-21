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
            var controlCommandKeyPressed = this._isMacintosh() ? e.metaKey : e.ctrlKey;
            if (controlCommandKeyPressed && (key === 40 || key === 38)) {
                var focusRow = dojoQuery(".mx-focus", this._grid.domNode)[0];
                if (focusRow && dojoClass.contains(focusRow, "selected")) {

                    if (key === 40) {
                        rowToSelect = focusRow.nextSibling;
                    } else if (key === 38) {
                        rowToSelect = focusRow.previousSibling;
                    }
                    if (rowToSelect) {
                        var obj = this._grid._getObjectFromNode(rowToSelect);
                        if (obj) {
                            this._grid._addToSelection(obj.getGuid());
                            this._grid.selectRow(rowToSelect);
                        } else {
                            console.error("While selecting a row, could not find mx object related to row.");
                        }
                    }
                }
            }
        },
        _isMacintosh: function() {
            return navigator.platform.indexOf("Mac") > -1;
        }
    });
});

require(["DataGridKeyboardCommands/widget/DataGridKeyboardCommands"]);