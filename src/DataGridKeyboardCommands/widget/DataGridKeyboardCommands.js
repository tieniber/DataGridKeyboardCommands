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
        _anchorStack: null,

        KEY_UP: 38,
        KEY_DOWN: 40,

        constructor: function() {
            this._handles = [];
            this._anchorRowStack = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");
            /**
             * Array.from polyfill
             * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Polyfill
             */
            // Production steps of ECMA-262, Edition 6, 22.1.2.1
            if (!Array.from) {
                Array.from = (function() {
                    var toStr = Object.prototype.toString;
                    var isCallable = function(fn) {
                        return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
                    };
                    var toInteger = function(value) {
                        var number = Number(value);
                        if (isNaN(number)) { return 0; }
                        if (number === 0 || !isFinite(number)) { return number; }
                        return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
                    };
                    var maxSafeInteger = Math.pow(2, 53) - 1;
                    var toLength = function(value) {
                        var len = toInteger(value);
                        return Math.min(Math.max(len, 0), maxSafeInteger);
                    };

                    // The length property of the from method is 1.
                    return function from(arrayLike /*, mapFn, thisArg */ ) {
                        // 1. Let C be the this value.
                        var C = this;

                        // 2. Let items be ToObject(arrayLike).
                        var items = Object(arrayLike);

                        // 3. ReturnIfAbrupt(items).
                        if (arrayLike == null) {
                            throw new TypeError('Array.from requires an array-like object - not null or undefined');
                        }

                        // 4. If mapfn is undefined, then let mapping be false.
                        var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
                        var T;
                        if (typeof mapFn !== 'undefined') {
                            // 5. else
                            // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                            if (!isCallable(mapFn)) {
                                throw new TypeError('Array.from: when provided, the second argument must be a function');
                            }

                            // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
                            if (arguments.length > 2) {
                                T = arguments[2];
                            }
                        }

                        // 10. Let lenValue be Get(items, "length").
                        // 11. Let len be ToLength(lenValue).
                        var len = toLength(items.length);

                        // 13. If IsConstructor(C) is true, then
                        // 13. a. Let A be the result of calling the [[Construct]] internal method 
                        // of C with an argument list containing the single item len.
                        // 14. a. Else, Let A be ArrayCreate(len).
                        var A = isCallable(C) ? Object(new C(len)) : new Array(len);

                        // 16. Let k be 0.
                        var k = 0;
                        // 17. Repeat, while k < len… (also steps a - h)
                        var kValue;
                        while (k < len) {
                            kValue = items[k];
                            if (mapFn) {
                                A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                            } else {
                                A[k] = kValue;
                            }
                            k += 1;
                        }
                        // 18. Let putStatus be Put(A, "length", len, true).
                        A.length = len;
                        // 20. Return A.
                        return A;
                    };
                }());
            }
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._setupGrid();

            if (this._grid) {
                // target this._grid.contentNode so the search buttons still work
                this._grid.connect(this._grid.contentNode, "onkeydown", dojoLang.hitch(this, this._onKeyPress));
                // wait for the _gridRowNodes to be defined
                var wait = setInterval(dojoLang.hitch(this, function() {
                    if (Array.isArray(this._grid._gridRowNodes) && this._grid._gridRowNodes.length > 0) {
                        this._attachListenersToGridRows();
                        clearInterval(wait);
                    }
                }), 200);
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
            e.cancelBubble = true; // stop the mendix events
            e.preventDefault(); // stop the browser events (scrolling)
            var key = e.keyCode ? e.keyCode : e.which,
                rowToSelect = null,
                shiftKeyPressed = e.shiftKey,
                focusRow = dojoQuery(".mx-focus", this._grid.domNode)[0],
                modKeyPressed = this._isMacintosh() ? e.metaKey : e.ctrlKey;
            // if the arrow keys are pressed
            if (key === this.KEY_UP || key === this.KEY_DOWN) {
                // find the next seelcted row
                var firstSelected = dojoQuery(".selected", this._grid.domNode)[0],
                    lastSelected = dojoQuery(".selected", this._grid.domNode)[dojoQuery(".selected", this._grid.domNode).length - 1];
                rowToSelect = shiftKeyPressed ? (key === this.KEY_DOWN ? focusRow.nextSibling : focusRow.previousSibling) : (key === this.KEY_DOWN ? lastSelected.nextSibling : firstSelected.previousSibling);
                if (shiftKeyPressed && modKeyPressed) {
                    this._doJumpSelect(focusRow, key);
                } else if (shiftKeyPressed && rowToSelect) {
                    if (focusRow && dojoClass.contains(focusRow, "selected")) {
                        this._toggleSelectedRow(focusRow, rowToSelect, key);
                    }
                } else if (rowToSelect) {
                    rowToSelect = (key === this.KEY_DOWN ? lastSelected.nextSibling : firstSelected.previousSibling);
                    this._moveSelection(rowToSelect);
                } else if (!shiftKeyPressed) {
                    rowToSelect = (key === this.KEY_DOWN ? lastSelected : firstSelected);
                    this._moveSelection(rowToSelect);
                }
            }
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
                this._removeFromSelection(fromRow);
            } else if (!dojoClass.contains(toRow, "selected")) {
                // add
                this._addToSelection(toRow);
            }
            this._transferFocus(toRow, false);
            // if moving from anchor, reset the direction
            if (fromRow === this._anchorRow) {
                this._direction = key;
            }
        },

        /**
         * Toggle selection of the given row
         * Returns true if selection is made, false if deselection
         **/
        _toggleSelection: function(row) {
            if (dojoClass.contains(row, "selected")) {
                this._removeFromSelection(row);
                return false;
            } else {
                this._addToSelection(row);
                return true;
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
                    this._onRowClick(e);
                }));
            }));
        },

        _onRowClick: function(e) {
            var targetRow = this._recursivelyFindTableRowParent(e.target),
                modKeyPressed = this._isMacintosh() ? e.metaKey : e.ctrlKey;

            // cancel the bubble --> disable the mendix events
            e.cancelBubble = true;
            if (e.shiftKey && this._anchorRow) {
                // shift key was clicked, select everything between the focused row and this one
                console.log("shifty");
                var a = this._anchorRow,
                    collecting = false,
                    set = [];
                Array.from(a.parentElement.children).forEach(dojoLang.hitch(this, function(element) {
                    if (element === a || element === targetRow) {
                        collecting = !collecting;
                        set.push(element);
                    } else if (collecting) {
                        set.push(element);
                    }
                }));
                this._selectRowsInSet(set);
                document.getSelection().removeAllRanges(); // remove all the highlighted text from the DOM
                this._transferFocus(targetRow, false);
            } else if (modKeyPressed) {
                this._transferFocus(targetRow, true);
                var selected = this._toggleSelection(targetRow);
                if (selected) { //row was selected
                    if (this._anchorRow) {
                        this._anchorRowStack.push(this._anchorRow); //save the current anchor
                    }
                    this._anchorRow = targetRow;
                    this._direction = null;
                } else {
                    if (this._anchorRowStack.length > 0) {
                        var newAnchor = this._anchorRowStack.pop(); //get the previous anchor
                        this._anchorRow = newAnchor;
                        this._direction = null;
                    } else {
                        this._anchorRow = null;
                        this._direction = null;
                    }
                }

                //e.cancelBubble = false;
            } else {
                this._transferFocus(targetRow, true);
                this._moveSelection(targetRow);
            }
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
            set.forEach(dojoLang.hitch(this, function(tr) {
                this._addToSelection(tr);
            }));
        },
        /**
         * Remove Rows In Set
         * ---
         * Remove all the rows in a given array
         * @param {Array::HTMLElement} set - the <tr> elements to remove
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _removeRowsInSet: function(set) {
            set.forEach(dojoLang.hitch(this, function(tr) {
                this._removeFromSelection(tr);
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
                        this._transferFocus(this._grid._gridRowNodes[k], true);
                        focused = true;
                    } else {
                        set.push(this._grid._gridRowNodes[k]);
                    }
                }
            } else {
                for (var j = i + 1; j < this._grid._gridRowNodes.length && !focused; j++) {
                    if (dojoClass.contains(this._grid._gridRowNodes[j], "selected")) {
                        this._transferFocus(this._grid._gridRowNodes[j], true);
                        focused = true;
                    } else {
                        set.push(this._grid._gridRowNodes[j]);
                    }
                }
            }
            if (set.length > 0) {
                this._selectRowsInSet(set);
                if (!focused) {
                    this._transferFocus(set[set.length - 1], false);
                }
            }

        },

        /**
         * Transfer Focus
         * ---
         * Transfer the focus to a new row
         * @param {HTMLElement} toRow - the row that should be focused
         * @param {Boolean} resetAnchor - if true, resets the anchor to the newly focused row
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _transferFocus: function(toRow, resetAnchor) {
            this._grid._gridRowNodes.forEach(dojoLang.hitch(this, function(row) {
                dojoClass.remove(row, "mx-focus");
            }));
            // dojoClass.remove(fromRow, "mx-focus");
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
            this._anchorRowStack = [];
            this._direction = null;
        },

        _moveSelection: function(toRow) {
            this._removeRowsInSet(this._grid._gridRowNodes);
            this._addToSelection(toRow);
            this._transferFocus(toRow, true);
        },

        /**
         * Add to Selection
         * ---
         * @since Dec 11, 2017
         * - Add call to datagrid._shareSelection, which updates listening DVs
         * Add a single row to the selection
         * @param {HTMLElement} row - the row whose object should be added to the selection
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _addToSelection: function(row) {
            var obj = this._grid._getObjectFromNode(row);
            this._grid._addToSelection(obj.getGuid());
            this._grid.selectRow(row);
            this._grid._shareSelection(this._grid._metaEntity.getEntity());
        },

        /**
         * Remove from Selection
         * ---
         * @since Dec 11, 2017
         * - Add call to datagrid._shareSelection, which updates listening DVs
         * Remove a single row from the selection
         * @param {HTMLElement} row - the row whose object should be removed from the selection
         * @author Conner Charlebois
         * @since Nov 21, 2017
         */
        _removeFromSelection: function(row) {
            var obj = this._grid._getObjectFromNode(row);
            this._grid._removeFromSelection(obj.getGuid());
            this._grid.deselectRow(row);
            this._grid._shareSelection(this._grid._metaEntity.getEntity());
        }
    });
});

require(["DataGridKeyboardCommands/widget/DataGridKeyboardCommands"]);