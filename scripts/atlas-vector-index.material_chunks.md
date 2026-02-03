# Atlas Vector Search Index: material_chunks

Update `numDimensions` if you change the embedding output dimensionality.
```json
{
  "name": "material_chunks_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 768,
        "similarity": "cosine"
      },
      { "type": "filter", "path": "user" },
      { "type": "filter", "path": "material" },
      { "type": "filter", "path": "className" }
    ]
  }
}
```
