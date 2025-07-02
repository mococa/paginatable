# Paginatable

I think we all kinda hate implementing pagination. 
It just sucks and React sometimes makes it worse.

Pagination is often very repetitive and React state handling doesn't always make it easier.

This came up from building a course platform of mine and I think it'd be interesting to share in my public 
Github.

`Paginatable` is a memory-efficient class that handles client-side pagination with minimal re-renders. 
It uses `Map` and `Set` to avoid redundant state changes and keeps item references stable. 
Items stack up as pages load and are cleanly removed when needed.

The `.items` getter returns a memoized array, ideal for rendering with `map()` in JSX.

The core is framework-agnostic—only the setDispatch method is React-specific.

## Requirements

Items to have an `id` property, but this is easily tweakable to use `_id`, `sortKey`, etc.

## Why?

This pattern avoids the typical pitfalls of pagination in React:
- Repeated fetching of the same pages
- Arrays triggering re-renders on every mutation
- Clunky state spread across multiple places

With `Paginatable`, you get:
- Clear, predictable pagination flow
- Shared references, less GC pressure
- Simple `.items` array for rendering, without triggering React loops

## Usage

### Front-end

To use this hook, we first need to have a function that returns an object containing the items in a given page 
and a total count of items.

like this:

```js
function fetcher(page) {
  const response = await fetch('...').then((r) => r.json());
  return { data: response.items, total: response.count };
}
```

then, you can instantiate this Paginatable class passing this function in the constructor:
```js
const paginatable = new Paginatable(fetcher);
```

Now coming more to the React side, to use the Hook, you can do the following in a context, component, whatever:
```jsx
const users = usePaginatable(paginatable);
```

and you're free to simply paginate with `users.paginate(n)` or reset with `users.reset()` on logout or some other 
event that you no longer want the state.

Silly working example:
```jsx
// Creating a context...
const [user, setUsers] = useState(getDefaultUser())
const books = usePaginatable(paginatable); // users can list books after login

useEffect(() => {
  if (!user) return;

  books.paginate(1); // get the first page by default on login
}, [user]);

const logout = useCallback(() => {
  books.reset();
}, [books.reset]);

const login = useCallback(() => {
  // logic to get the user
  setUser(...)
}, [])

...

// In a component
const [page, setPage] = useState(1);
const { books } = useMyContext();

useEffect(() => {
  if (page === 1) return; // Already fetched in context

  books.paginate(page);
// books.paginate is safe to ignore in the deps list as it's stable,
// but adding it for lint doesn't break anything
}, [page, books.paginate]);

return (
  <div>
    <h1>Books</h1>

    <ul>
      {books.items.map((book) => (
        <li key={book.id}>{book.title}</li>
      )}
    </ul>

    <footer>
      <small>{page} of {books.total}</small>
      
      <nav>
        {/* Implement the JSX your way */}
        <button onClick={() => setPage(1)}>1</button>
        <button onClick={() => setPage(2)}>2</button>
        <button onClick={() => setPage(3)}>3</button>
      </nav>
    </footer>
  </div>
)
```

### Back-end

For the back-end, we do the regular, we go listing adding a limit (page size) and offset (start point).

a postgres example:
```sql
-- name: ListMyBooks :many
SELECT * FROM books
ORDER BY created_at DESC
LIMIT $1 OFFSET $2; -- Limit is the page size and offset is (page - 1) * pageSize

-- name: CountMyBooks :one
SELECT COUNT(*) FROM books;
```

#### Example of a Go application with Echo

We can have a Pagination struct like the following - a limit (page size), a page indicator, and an offset 
`func` that's calculated by multiplying the limit by the page minus 1 (because pages are treated as starting
on 1, not 0).


```go
package something

import (
	"strconv"

	"github.com/labstack/echo/v4"
)

type Pagination struct {
	Limit int32
	Page  int32
}

const PAGE_SIZE = "10"

func NewPagination(c echo.Context) (*Pagination, error) {
	pageStr := c.QueryParam("page")
	if pageStr == "" {
		pageStr = "1"
	}

	limit, err := strconv.Atoi(PAGE_SIZE) // You can use a queryParameter instead, just like the ` pageStr`
	if err != nil || limit <= 0 {
		return nil, echo.NewHTTPError(400, "invalid limit parameter")
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		return nil, echo.NewHTTPError(400, "invalid page parameter")
	}

	return &Pagination{
		Limit: int32(limit),
		Page:  int32(page),
	}, nil
}

func (p *Pagination) Offset() int32 {
	return (p.Page - 1) * p.Limit
}
```

Now we can instantiate this struct with the `NewPagination` function in the handlers to know which page the
consumer needs, like the following:

```go
func MyHandler(c echo.Context) error {
  pagination, err := NewPagination(c)
  if err != nil {
    return err
  }

  books, err := ListMyBooks(ListMyBooksParams{
    Limit: pagination.Limit,
    Offset: pagination.Offset(),
  })
  // code...
  count, err := CountMyBooks(ctx)
  // code...
}
```

This is just a dummy example and can be implemented however it's needed.
