import type { Dispatch } from "react";

const messages = {
	NOT_FOUND: "Item was not found in the dataset",
	FAILED_TO_UPDATE: "Failed to update item with id",
	FAILED_TO_GET: "Failed to get item with id",
	FAILED_TO_REMOVE: "Failed to remove item with id",
};

/**
 * @description
 * Paginatable class to handle pagination of items.
 * It allows fetching items page by page and keeps track of already fetched items.
 */
export class Paginatable<T extends { id: number }> {
	/** Total of items in the database (count) */
	total: number;

	/** Map of loading states for each page */
	loading: Map<number, boolean>;

	/** Map of items already fetched */
	private _items: Map<T["id"], T>;

	/** Cache of items fetched references so far */
	private _itemsCache: T[] | null = null;

	/** Already visited pages */
	private seen: Set<number>;

	/** Function to add items */
	private onPaginate: (
		page: number,
	) => Promise<{ data: T[] | null; total: number }>;

	/** Dispatch function to update the state */
	private dispatch: Dispatch<React.SetStateAction<Paginatable<T>>>;

	constructor(
		onPaginate: (page: number) => Promise<{ data: T[] | null; total: number }>,
	) {
		this._items = new Map<T["id"], T>();
		this.loading = new Map();
		this.total = 0;
		this.seen = new Set([]);
		this.onPaginate = onPaginate;
	}

	setDispatch(d: Dispatch<React.SetStateAction<Paginatable<T>>>) {
		this.dispatch = d;
		return this;
	}

	/**
	 * @description
	 * Array of items fetched so far.
	 *
	 * The reference is cached to avoid unnecessary recalculations.
	 * If the items are modified, the cache is reset to null.
	 */
	get items(): T[] {
		if (this._itemsCache) return this._itemsCache;

		this._itemsCache = Array.from(this._items.values());
		return this._itemsCache;
	}

	/**
	 * @description
	 * Fetches items for the given page and updates the items and total count.
	 * It avoids fetching the same page multiple times.
	 *
	 * @param page - The page number to fetch.
	 */
	async paginate(page: number) {
		if (this.seen.has(page)) return;
		this.seen.add(page);

		this.loading.set(page, true);
		const { data, total } = await this.onPaginate(page);
		this.loading.set(page, false);

		this.total = total;

		for (const item of data || []) {
			this._items.set(item.id, item);
		}

		this.dispatch(this.clone());
	}

	/**
	 * @description
	 * Resets the items, total count, and seen pages.
	 * Returns the instance for method chaining.
	 */
	reset() {
		this._items.clear();
		this._itemsCache = null;
		this.total = 0;
		this.seen.clear();
		this.loading.clear();
		return this;
	}

	/**
	 * @description
	 * Adds an item to the end of the items array
	 *
	 * @param item Item to be added
	 */
	add(item: T) {
		if (this.has(item.id)) return; // Avoid unnecessary dispatch if item already exists
		this._itemsCache = null;

		this._items.set(item.id, item);
		this.dispatch(this.clone());
	}

	/**
	 * @description
	 * Removes an item based on its ID
	 *
	 * @param itemId item id
	 */
	remove(itemId: T["id"]) {
		const deleted = this._items.delete(itemId);
		if (!deleted) {
			console.warn(messages.NOT_FOUND, messages.FAILED_TO_REMOVE, itemId);
			return; // Avoid unnecessary dispatch if item does not exist
		}

		this._itemsCache = null;
		this.dispatch(this.clone());
	}

	/**
	 * @description
	 * Updates an item based on its ID
	 *
	 * @param item Updated item
	 */
	update(item: T) {
		if (!this.has(item.id)) {
			console.warn(messages.NOT_FOUND, messages.FAILED_TO_UPDATE, item.id);
			return; // Avoid unnecessary dispatch if item does not exist
		}

		this._items.set(item.id, item);
		this._itemsCache = null;
		this.dispatch(this.clone());
	}

	/**
	 * @description
	 * Checks if an item with the given ID exists in the items.
	 *
	 * @param itemId Item ID to check
	 * @returns True if the item exists, false otherwise
	 */
	has(itemId: T["id"]): boolean {
		return this._items.has(itemId);
	}

	/**
	 * @description
	 * Gets an item by its ID.
	 *
	 * @param itemId Item ID to retrieve
	 * @returns The item if found, undefined otherwise
	 */
	get(itemId: T["id"]): T | undefined {
		const item = this._items.get(itemId);
		if (!item) console.warn(messages.NOT_FOUND, messages.FAILED_TO_GET, itemId);

		return item;
	}

	/**
	 * @description
	 * Creates a clone of the current Paginatable instance.
	 * This is useful to avoid mutating the original instance when updating state.
	 *
	 * @returns New reference of Paginatable instance with the same state.
	 */
	private clone(): Paginatable<T> {
		const cloned = new Paginatable(this.onPaginate);
		cloned._items = this._items;
		cloned.total = this.total;
		cloned.seen = new Set(this.seen);
		cloned.dispatch = this.dispatch;
		cloned.loading = new Map(this.loading);
		cloned._itemsCache = this._itemsCache;

		return cloned;
	}
}
