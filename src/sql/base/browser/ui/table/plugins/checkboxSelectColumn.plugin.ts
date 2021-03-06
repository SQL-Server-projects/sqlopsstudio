// Adopted and converted to typescript from https://github.com/6pac/SlickGrid/blob/master/plugins/slick.checkboxselectcolumn.js

import 'vs/css!vs/base/browser/ui/checkbox/checkbox';


import { mixin } from 'vs/base/common/objects';
import * as nls from 'vs/nls';
import { ICheckboxStyles } from 'vs/base/browser/ui/checkbox/checkbox';
import { Color } from 'vs/base/common/color';
import * as strings from 'vs/base/common/strings';

export interface ICheckboxSelectColumnOptions extends Slick.PluginOptions, ICheckboxStyles {
	columnId?: string;
	cssClass?: string;
	toolTip?: string;
	width?: number;
	title?: string;
}

const defaultOptions: ICheckboxSelectColumnOptions = {
	columnId: '_checkbox_selector',
	cssClass: null,
	toolTip: nls.localize('selectDeselectAll', 'Select/Deselect All'),
	width: 30,
	inputActiveOptionBorder: Color.fromHex('#007ACC')
};

const checkBoxTemplate = `<div style="display: flex; align-items: center; flex-direction: column">
							<div style="border-color: {0}" role="checkbox" aria-checked="{1}" aria-label="" class="custom-checkbox sql-checkbox {2}"></div>
						</div>`;

export class CheckboxSelectColumn<T> implements Slick.Plugin<T> {
	private _options: ICheckboxSelectColumnOptions;
	private _grid: Slick.Grid<T>;
	private _handler = new Slick.EventHandler();
	private _selectedRowsLookup = {};
	private _checkboxTemplate: string;

	constructor(options?: Slick.PluginOptions) {
		this._options = mixin(options, defaultOptions, false);
		this.applyStyles();
	}

	public init(grid: Slick.Grid<T>): void {
		this._grid = grid;
		this._handler
			.subscribe(this._grid.onSelectedRowsChanged, (e, args) => this.handleSelectedRowsChanged(e, args))
			.subscribe(this._grid.onClick, (e, args) => this.handleClick(e, args))
			.subscribe(this._grid.onHeaderClick, (e, args) => this.handleHeaderClick(e, args))
			.subscribe(this._grid.onKeyDown, (e, args) => this.handleKeyDown(e, args));
	}

	public destroy(): void {
		this._handler.unsubscribeAll();
	}

	private handleSelectedRowsChanged(e: Event, args: Slick.OnSelectedRowsChangedEventArgs<T>): void {
		let selectedRows = this._grid.getSelectedRows();
		let lookup = {}, row, i;
		for (i = 0; i < selectedRows.length; i++) {
			row = selectedRows[i];
			lookup[row] = true;
			if (lookup[row] !== this._selectedRowsLookup[row]) {
				this._grid.invalidateRow(row);
				delete this._selectedRowsLookup[row];
			}
		}
		for (i in this._selectedRowsLookup) {
			this._grid.invalidateRow(i);
		}
		this._selectedRowsLookup = lookup;
		this._grid.render();

		if (!this._options.title) {
			if (selectedRows.length && selectedRows.length === this._grid.getDataLength()) {
				this._grid.updateColumnHeader(this._options.columnId,
					strings.format(this._checkboxTemplate, 'true', 'checked'),
					this._options.toolTip);
			} else {
				this._grid.updateColumnHeader(this._options.columnId,
					strings.format(this._checkboxTemplate, 'true', 'unchecked'),
					this._options.toolTip);
			}
		}
	}

	private handleKeyDown(e: KeyboardEvent, args: Slick.OnKeyDownEventArgs<T>): void {
		if (e.which === 32) {
			if (this._grid.getColumns()[args.cell].id === this._options.columnId) {
				// if editing, try to commit
				if (!this._grid.getEditorLock().isActive() || this._grid.getEditorLock().commitCurrentEdit()) {
					this.toggleRowSelection(args.row);
				}
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}
	}

	private handleClick(e: Event, args: Slick.OnClickEventArgs<T>): void {
		// clicking on a row select checkbox
		if (this._grid.getColumns()[args.cell].id === this._options.columnId && $(e.target).is('.custom-checkbox')) {
			// if editing, try to commit
			if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			this.toggleRowSelection(args.row);
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	}

	private toggleRowSelection(row: number): void {
		if (this._selectedRowsLookup[row]) {
			this._grid.setSelectedRows(this._grid.getSelectedRows().filter(n => n !== row));
		} else {
			this._grid.setSelectedRows(this._grid.getSelectedRows().concat(row));
		}
	}

	private handleHeaderClick(e: Event, args: Slick.OnHeaderClickEventArgs<T>): void {
		if (!this._options.title && args.column.id === this._options.columnId && $(e.target).is('.custom-checkbox')) {
			// if editing, try to commit
			if (this._grid.getEditorLock().isActive() && !this._grid.getEditorLock().commitCurrentEdit()) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			if ($(e.target).is('.unchecked')) {
				let rows = [];
				for (let i = 0; i < this._grid.getDataLength(); i++) {
					rows.push(i);
				}
				this._grid.setSelectedRows(rows);
				this._grid.updateColumnHeader(this._options.columnId,
					strings.format(this._checkboxTemplate, 'true', 'checked'),
					this._options.toolTip);
			} else {
				this._grid.setSelectedRows([]);
				this._grid.updateColumnHeader(this._options.columnId,
					strings.format(this._checkboxTemplate, 'true', 'unchecked'), this._options.toolTip);
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		}
	}

	public getColumnDefinition(): Slick.Column<T> {
		return {
			id: this._options.columnId,
			name: this._options.title || strings.format(this._checkboxTemplate, 'true', 'unchecked'),
			toolTip: this._options.toolTip,
			field: 'sel',
			width: this._options.width,
			resizable: false,
			sortable: false,
			cssClass: this._options.cssClass,
			formatter: (r, c, v, cd, dc) => this.checkboxSelectionFormatter(r, c, v, cd, dc)
		};
	}

	private checkboxSelectionFormatter(row, cell, value, columnDef: Slick.Column<T>, dataContext): string {
		if (dataContext) {
			return this._selectedRowsLookup[row]
				? strings.format(this._checkboxTemplate, 'true', 'checked')
				: strings.format(this._checkboxTemplate, 'true', 'unchecked');
		}
		return null;
	}

	public style(styles: ICheckboxStyles): void {
		if (styles.inputActiveOptionBorder) {
			this._options.inputActiveOptionBorder = styles.inputActiveOptionBorder;
		}
		this.applyStyles();
	}

	protected applyStyles(): void {
		this._checkboxTemplate = strings.format(checkBoxTemplate, this._options.inputActiveOptionBorder.toString(), '{0}', '{1}');
		if (this._grid) {
			this._grid.invalidateAllRows();
			this._grid.render();
		}
	}
}