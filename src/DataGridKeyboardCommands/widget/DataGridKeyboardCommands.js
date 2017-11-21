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
                // wait for the _gridRowNodes to be defined
                var wait = setInterval(dojoLang.hitch(this, function() {
                    if (this._grid._gridRowNodes) {
                        this._attachListenersToGridRows();
                        clearInterval(wait);
                    }
                }), 100);
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
                var modKeyPressed = this._isMacintosh() ? e.metaKey : e.ctrlKey;
                var focusRow = dojoQuery(".mx-focus", this._grid.domNode)[0];
                if (modKeyPressed) {
                    this._doJumpSelect(focusRow, key);
                } else {
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
            this._transferFocus(fromRow, toRow, false);
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
                    if (e.shiftKey && this._anchorRow) {
                        // cancel the bubble --> disable the mendix events
                        e.cancelBubble = true;
                        // shift key was clicked, select everything between the focused row and this one
                        console.log("shifty");
                        var a = this._anchorRow,
                            b = this._recursivelyFindTableRowParent(e.target),
                            collecting = false,
                            set = [];
                        Array.from(a.parentElement.children).forEach(dojoLang.hitch(this, function(element) {
                            if (element === a || element === b) {
                                collecting = !collecting;
                                set.push(element);
                            } else if (collecting) {
                                set.push(element);
                            }
                        }));
                        this._selectRowsInSet(set);
                        document.getSelection().removeAllRanges(); // remove all the highlighted text from the DOM
                    }
                    this._anchorRow = this._recursivelyFindTableRowParent(e.target);
                    this._direction = null;

                }));
            }));
        },

        /**
         * Select Rows In Set
         * ---
         * Select all the rows in a given array
         * @param {Array::HTMLElement} set - the <tr> elements to select
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _selectRowsInSet: function(set) {
            var obj;
            set.forEach(dojoLang.hitch(this, function(tr) {
                obj = this._grid._getObjectFromNode(tr);
                this._grid._addToSelection(obj.getGuid());
                this._grid.selectRow(tr);
            }));
        },

        /**
         * Do Jump Select
         * ---
         * Select all the rows between the current one and either the next selected row or the end of the table
         * @param {HTMLElement} fromRow - the starting row of the jump select
         * @param {Number} direction - the direction of the jump @see this._direction
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _doJumpSelect: function(fromRow, direction) {
            // select everything between `fromRow` and either the next selected row in `direction` or the end of the list
            var i = this._grid._gridRowNodes.indexOf(fromRow),
                set = [],
                focused = false;
            if (direction === this.KEY_UP) {
                for (var k = i - 1; k >= 0 && !focused; k--) {
                    if (dojoClass.contains(this._grid._gridRowNodes[k], "selected")) {
                        this._transferFocus(fromRow, this._grid._gridRowNodes[k], true);
                        focused = true;
                    } else {
                        set.push(this._grid._gridRowNodes[k]);
                    }
                }
            } else {
                for (var j = i + 1; j < this._grid._gridRowNodes.length && !focused; j++) {
                    if (dojoClass.contains(this._grid._gridRowNodes[j], "selected")) {
                        this._transferFocus(fromRow, this._grid._gridRowNodes[j], true);
                        focused = true;
                    } else {
                        set.push(this._grid._gridRowNodes[j]);
                    }
                }
            }
            if (set.length > 0) {
                this._selectRowsInSet(set);
                if (!focused) {
                    this._transferFocus(fromRow, set[set.length - 1], false);
                }
            }

        },

        /**
         * Transfer Focus
         * ---
         * Transfer the focus to a new row
         * @param {HTMLElement} fromRow - the row that is currently focused
         * @param {HTMLElement} toRow - the row that should be focused
         * @param {Boolean} resetAnchor - if true, resets the anchor to the newly focused row
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _transferFocus: function(fromRow, toRow, resetAnchor) {
            dojoClass.remove(fromRow, "mx-focus");
            dojoClass.add(toRow, "mx-focus");
            if (resetAnchor) {
                this._resetAnchorPosition(toRow);
            }
        },

        /**
         * Reset Anchor Position
         * ---
         * Reset the anchor to the specified row, and reset the direction
         * @param {HTMLElement} anchorRow - the new row to anchor
         * @author Conner Charlebois
         * @since Nove 21, 2017
         */
        _resetAnchorPosition: function(anchorRow) {
            this._anchorRow = anchorRow;
            this._direction = null;
        },
    });
});

require(["DataGridKeyboardCommands/widget/DataGridKeyboardCommands"]);