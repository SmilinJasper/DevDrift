fetch("http://localhost:3000/api/listings?limit=2")
  .then(r => r.json())
  .then(async data => {
     console.log("First page ids:", data.data.map(d => d.id));
     console.log("Cursor:", data.pagination.next_cursor);
     const res2 = await fetch("http://localhost:3000/api/listings?limit=2&cursor=" + encodeURIComponent(data.pagination.next_cursor));
     const data2 = await res2.json();
     console.log("Second page ids:", data2.data ? data2.data.map(d => d.id) : data2);
     console.log("Second page has_more:", data2.pagination?.has_more);
  })
  .catch(console.error);
