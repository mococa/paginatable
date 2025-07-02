/* ---------- External ---------- */
import { useEffect, useState } from "react";

/* ---------- Helpers ---------- */
import type { Paginatable } from ./paginatable";

/**
 * @description
 * Custom hook to create a paginatable state.
 * It initializes the state with the provided function and sets up a dispatch function
 * to update the state when pagination occurs.
 *
 * @param fn - A function that returns a Paginatable instance.
 * @returns An object containing the paginatable state without the `setDispatch` method.
 *          This allows the paginatable state to be used in components without exposing
 *          the internal dispatch mechanism, ensuring that the state can only be updated
 *          through the provided methods of the Paginatable class.
 */
export function usePaginatable<T extends { id: number }>(
	fn: Paginatable<T> | (() => Paginatable<T>),
) {
	const [state, setState] = useState(() => {
    if (typeof fn === "function") return fn();
    return fn;
  });

	useEffect(() => {
		state.setDispatch(setState);
	}, [state.setDispatch]);

	return state;
}
