def retrieve_context(query, vectorstore, enabled=None, disabled=None, top_k=2):
    """
    Perform a similarity search using vectorstore.search_with_score, select the top_k docs
    based on their semantic distance to the query, then apply keyword filters.
    Returns:
      - ctx: concatenated snippets with content, images, and links
      - sources: deduped list of product URLs
      - image_urls: list of image URLs from the selected docs
    """
    # 1) Get (doc, score) tuples
    results = vectorstore.similarity_search_with_score(query, k=top_k * 3)

    # 2) Filter by enabled/disabled keywords
    filtered = []
    for doc, score in results:
        kws = [kw.lower() for kw in doc.metadata.get("keywords", [])]
        if enabled and not any(e.lower() in kws for e in enabled):
            continue
        if disabled and any(dk.lower() in kws for dk in disabled):
            continue
        filtered.append((doc, score))

    # 3) Sort by ascending distance (more similar first)
    filtered.sort(key=lambda x: x[1])

    # 4) Select top_k
    selected = [doc for doc, _ in filtered[:top_k]]
    if not selected:
        return "No matching campaign information found.", [], []

    # 5) Build context and collect URLs
    ctx_parts, image_urls, product_urls = [], [], []
    for doc in selected:
        snippet = doc.page_content
        if img := doc.metadata.get("image_url"):
            snippet += f"\n\n![Product Image]({img})"
            image_urls.append(img)
        if url := doc.metadata.get("product_url"):
            snippet += f"\n\nProduct Link: {url}"
            product_urls.append(url)
        ctx_parts.append(snippet)

    # 6) Join context
    ctx = "\n\n".join(ctx_parts)

    # 7) Dedupe product URLs
    deduped = list(dict.fromkeys(product_urls))

    return ctx, deduped, image_urls
