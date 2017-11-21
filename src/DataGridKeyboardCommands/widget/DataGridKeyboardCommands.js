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
    "dojo/query",
    "dojo/aspect"
], function(declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoQuery, aspect) {
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
                // setTimeout(dojoLang.hitch(this, this._attachListenersToGridRows), 500);
                // wait for the _gridRowNodes to be defined
                var wait = setInterval(dojoLang.hitch(this, function() {
                    if (this._grid._gridRowNodes) {
                        this._attachListenersToGridRows();
                        clearInterval(wait);
                    }
                }), 100);

                // aspect.before(this._grid, "_addToSelection", dojoLang.hitch(this, function(method, args) {
                //     var selectedRows = dojoQuery(".selected", this._grid.domNode);
                //     if (selectedRows.length === 1) {
                //         this._anchorRow = selectedRows[0];
                //     }
                // }));
                // this._grid.connect(this._grid.domNode, "click", dojoLang.hitch(this, this._onClickRowNode));
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
                this._direction = this._direction || key; //cache
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
                        this._toggleSelectedRow(focusRow, rowToSelect, key);
                    }
                }
            }
        },
        _onClickRowNode: function(e) {
            console.log(e.target);
        },
        _isMacintosh: function() {
            return navigator.platform.indexOf("Mac") > -1;
        },

        /**
         * Toggle Selected Row
         * ---
         * Update the DOM appropriately when a user moves the focus
         * @param {HTMLElement} fromRow - the node that currently has focus (will not afterward)
         * @param {HTMLElement} toRow - the node that will get focus
         * @param {Number} key - the code for the arrow key that the user hit
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _toggleSelectedRow: function(fromRow, toRow, key) {
            // console.log(`${this._direction} and ${key}`);
            // key match, sel           f-move
            // key match, not sel       f-move, s-add OK
            // key not match, sel       f-move, s-rem OK
            // key not match, not sel   f-move, s-add OK
            var obj;
            if (dojoClass.contains(toRow, "selected") && key !== this._direction) {
                // deselect
                obj = this._grid._getObjectFromNode(fromRow);
                this._grid._removeFromSelection(obj.getGuid());
                this._grid.deselectRow(fromRow);
            } else if (!dojoClass.contains(toRow, "selected")) {
                // add
                obj = this._grid._getObjectFromNode(toRow);
                this._grid._addToSelection(obj.getGuid());
                this._grid.selectRow(toRow);
            }
            dojoClass.remove(fromRow, "mx-focus");
            dojoClass.add(toRow, "mx-focus");

            // if moving from anchor, reset the direction
            if (fromRow === this._anchorRow) {
                this._direction = key;
            }
        },

        /**
         * Recursively Find Table Row Parent
         * ---
         * Gets the closest parent of type "TR"
         * Used in the onclick for the rows
         * @param {HTMLElement} node - the node
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _recursivelyFindTableRowParent: function(node) {
            if (node.tagName === "TR") {
                return node;
            } else {
                return this._recursivelyFindTableRowParent(node.parentElement);
            }
        },

        /**
         * Attach Listeners to Grid Rows
         * ---
         * Attach on-click listeners to the grid rows that, when fired, set the anchor row
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _attachListenersToGridRows: function() {
            this._grid._gridRowNodes.forEach(dojoLang.hitch(this, function(node) {
                this.connect(node, "click", dojoLang.hitch(this, function(e) {
                    this._anchorRow = this._recursivelyFindTableRowParent(e.target);
                }));
            }));
        }
    });
});

require(["DataGridKeyboardCommands/widget/DataGridKeyboardCommands"]);