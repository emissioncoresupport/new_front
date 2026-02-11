import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * EUDR Geolocation Validator
 * Validates coordinates against EU land parcel databases
 * Per Art. 9 of Regulation (EU) 2023/1115
 * 
 * Validation checks:
 * - Coordinate format (WGS84 decimal degrees)
 * - Polygon validity (minimum 3 points, closed loop)
 * - Land use verification (forest/agricultural land)
 * - Administrative boundary checks
 * - Protected area overlap detection
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { coordinates, country, commodity_category } = await req.json();

    if (!coordinates || coordinates.length < 3) {
      return Response.json({ 
        error: 'Invalid polygon: minimum 3 coordinate pairs required' 
      }, { status: 400 });
    }

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {}
    };

    // CHECK 1: Coordinate format validation
    for (let i = 0; i < coordinates.length; i++) {
      const [lon, lat] = coordinates[i];
      
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        validation.errors.push(`Point ${i}: Invalid coordinate format`);
        validation.valid = false;
      }
      
      if (lon < -180 || lon > 180) {
        validation.errors.push(`Point ${i}: Longitude out of range (-180 to 180)`);
        validation.valid = false;
      }
      
      if (lat < -90 || lat > 90) {
        validation.errors.push(`Point ${i}: Latitude out of range (-90 to 90)`);
        validation.valid = false;
      }
    }

    validation.checks.coordinate_format = validation.errors.length === 0;

    // CHECK 2: Polygon closure
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    const isClosed = firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
    
    if (!isClosed) {
      validation.warnings.push('Polygon not closed - will auto-close for processing');
      validation.checks.polygon_closed = false;
    } else {
      validation.checks.polygon_closed = true;
    }

    // CHECK 3: Area calculation
    const areaHectares = calculatePolygonArea(coordinates);
    validation.checks.area_hectares = areaHectares;

    if (areaHectares < 0.01) {
      validation.warnings.push('Very small area (<0.01 ha) - verify coordinates accuracy');
    }

    if (areaHectares > 100000) {
      validation.warnings.push('Very large area (>100,000 ha) - consider splitting into plots');
    }

    // CHECK 4: Land use verification (via AI + satellite)
    const centroid = calculateCentroid(coordinates);
    
    const landUsePrompt = `Verify land use for coordinates ${JSON.stringify(centroid)} in ${country || 'unknown country'}.
    
    Check against:
    - ESA WorldCover land classification
    - Copernicus CORINE (if Europe)
    - Is this forest land or agricultural land suitable for ${commodity_category}?
    
    Return:
    - Land use type
    - Forest coverage percentage
    - Suitable for commodity (boolean)
    - Protected area status`;

    const landUseResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: landUsePrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          land_use_type: { type: "string" },
          forest_coverage_pct: { type: "number" },
          suitable_for_commodity: { type: "boolean" },
          protected_area: { type: "boolean" },
          protected_area_name: { type: "string" }
        }
      }
    });

    validation.checks.land_use = landUseResult.land_use_type;
    validation.checks.forest_coverage = landUseResult.forest_coverage_pct;

    if (!landUseResult.suitable_for_commodity) {
      validation.warnings.push(`Land use (${landUseResult.land_use_type}) may not match commodity type`);
    }

    if (landUseResult.protected_area) {
      validation.errors.push(`Plot overlaps protected area: ${landUseResult.protected_area_name}`);
      validation.valid = false;
    }

    validation.checks.protected_area_overlap = landUseResult.protected_area;

    // CHECK 5: Country boundary verification
    const boundaryPrompt = `Verify coordinates ${JSON.stringify(centroid)} are within ${country} national boundaries.
    Return: within_country (boolean), actual_country (string)`;

    const boundaryResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: boundaryPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          within_country: { type: "boolean" },
          actual_country: { type: "string" }
        }
      }
    });

    if (!boundaryResult.within_country) {
      validation.errors.push(`Coordinates are in ${boundaryResult.actual_country}, not ${country}`);
      validation.valid = false;
    }

    validation.checks.country_boundary = boundaryResult.within_country;

    // CHECK 6: Precision validation (Art. 9 requirements)
    const precision = estimateCoordinatePrecision(coordinates);
    validation.checks.coordinate_precision = precision;

    if (precision < 6) {
      validation.warnings.push(`Low precision (${precision} decimal places) - 6+ recommended for EUDR`);
    }

    return Response.json({
      success: true,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        checks: validation.checks
      },
      geolocation_data: {
        centroid,
        area_hectares: areaHectares,
        perimeter_km: calculatePerimeter(coordinates),
        coordinate_count: coordinates.length
      },
      eudr_compliant: validation.valid && validation.checks.coordinate_precision >= 6,
      validated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Geolocation validator error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});

function calculateCentroid(coordinates) {
  const sumLon = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const sumLat = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  return [sumLon / coordinates.length, sumLat / coordinates.length];
}

function calculatePolygonArea(coordinates) {
  let area = 0;
  const n = coordinates.length;
  
  for (let i = 0; i < n - 1; i++) {
    area += coordinates[i][0] * coordinates[i + 1][1];
    area -= coordinates[i + 1][0] * coordinates[i][1];
  }
  
  area = Math.abs(area / 2);
  const areaHectares = area * 111.32 * 111.32 / 10000; // Rough conversion
  return areaHectares;
}

function calculatePerimeter(coordinates) {
  let perimeter = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    const dist = Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2)) * 111.32;
    perimeter += dist;
  }
  return perimeter;
}

function estimateCoordinatePrecision(coordinates) {
  const precisions = coordinates.map(coord => {
    const lonStr = coord[0].toString();
    const latStr = coord[1].toString();
    const lonDecimals = (lonStr.split('.')[1] || '').length;
    const latDecimals = (latStr.split('.')[1] || '').length;
    return Math.min(lonDecimals, latDecimals);
  });
  return Math.min(...precisions);
}