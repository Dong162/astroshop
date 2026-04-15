// Web Worker for handling search indexing and filtering off-thread
// This ensures that searching through 4000+ products doesn't block the UI

let productIndex: any[] = [];

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "INIT_INDEX") {
    productIndex = payload;
  }

  if (type === "SEARCH") {
    const { query, terms } = payload;
    
    if (terms.length === 0) {
      self.postMessage({ type: "RESULTS", payload: productIndex, query });
      return;
    }

    const results = productIndex.filter((item) => 
      terms.every((term: string) => item.searchKey.includes(term))
    );

    self.postMessage({ type: "RESULTS", payload: results, query });
  }
};
