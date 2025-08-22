import { Article } from '../models/Article.js';

// Transform MongoDB document to API format
function transformArticle(doc) {
  if (!doc) return null;
  const article = doc.toObject ? doc.toObject() : doc;
  return {
    _id: article._id.toString(),
    title: article.title,
    body: article.body,
    tags: article.tags || [],
    status: article.status,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt
  };
}

export async function searchKB(query, showAll = false) {
  let docs;
  
  if (!query) {
    // Return articles based on showAll parameter
    const statusFilter = showAll ? {} : { status: { $in: ['publish', 'published'] } };
    docs = await Article.find(statusFilter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
  } else {
    const q = query.trim();
    
    // Enhanced search with better scoring and relevance
    const searchTerms = q.split(/\s+/).filter(term => term.length > 2);
    const regexTerms = searchTerms.map(term => new RegExp(term, 'i'));
    
    // Build aggregation pipeline for better relevance scoring
    const statusFilter = showAll ? {} : { status: { $in: ['publish', 'published'] } };
    const pipeline = [
      {
        $match: {
          ...statusFilter,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { body: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
            // Match individual terms
            ...regexTerms.map(regex => ({ title: { $regex: regex } })),
            ...regexTerms.map(regex => ({ body: { $regex: regex } })),
            ...regexTerms.map(regex => ({ tags: { $regex: regex } }))
          ]
        }
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Title exact match gets highest score
              { $cond: [{ $regexMatch: { input: "$title", regex: q, options: "i" } }, 10, 0] },
              // Title contains search terms
              { $multiply: [
                { $size: { 
                  $filter: {
                    input: regexTerms,
                    cond: { $regexMatch: { input: "$title", regex: "$$this" } }
                  }
                }}, 3]
              },
              // Body contains search terms
              { $multiply: [
                { $size: { 
                  $filter: {
                    input: regexTerms,
                    cond: { $regexMatch: { input: "$body", regex: "$$this" } }
                  }
                }}, 1]
              },
              // Tag matches
              { $multiply: [
                { $size: { 
                  $filter: {
                    input: "$tags",
                    cond: { $regexMatch: { input: "$$this", regex: q, options: "i" } }
                  }
                }}, 5]
              }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, updatedAt: -1 } },
      { $limit: 20 }
    ];
    
    docs = await Article.aggregate(pipeline);
  }
  
  return docs.map(transformArticle);
}
