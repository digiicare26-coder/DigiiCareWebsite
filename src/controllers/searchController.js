// src/controllers/searchController.js
const clinicalRepo = require('../repositories/clinicalRepository');

async function searchScans(req, res) {
  try {
    const { linkToken } = req.user;
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
    }
    
    const results = await clinicalRepo.searchScansByText(linkToken, q);
    
    // Remove linkToken from response
    const sanitizedResults = results.map(scan => {
      const { linkToken, ...rest } = scan;
      return rest;
    });
    
    res.json({
      success: true,
      data: {
        query: q,
        count: sanitizedResults.length,
        results: sanitizedResults
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

module.exports = { searchScans };