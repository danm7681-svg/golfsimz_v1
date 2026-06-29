public List<TrajectoryPoint> SimulateShot(float speedMph, float launchDeg, float sideDeg, float backspinRpm, float sidespinRpm)
{
    var path = new List<TrajectoryPoint>();
    float v0 = speedMph * 0.44704f;
    float theta = launchDeg * (float)(Math.PI / 180.0f);
    float phi = sideDeg * (float)(Math.PI / 180.0f);

    float x = 0, y = 0, z = 0;
    float vx = v0 * (float)(Math.Cos(theta) * Math.Sin(phi));
    float vy = v0 * (float)Math.Sin(theta);
    float vz = v0 * (float)(Math.Cos(theta) * Math.Cos(phi));

    float omegaTotal = (float)((Math.Sqrt(backspinRpm * backspinRpm + sidespinRpm * sidespinRpm) * 2.0 * Math.PI) / 60.0);
    float spinAxisTilt = (float)Math.Atan2(sidespinRpm, backspinRpm);

    float currentTime = 0.0f;
    ApexHeightFt = 0.0f;
    int stepCount = 0;

    while (y >= 0.0f && currentTime < 15.0f)
    {
        float vMag = (float)Math.Sqrt(vx * vx + vy * vy + vz * vz);
        if (vMag < 0.1f) break;

        // Optimized Coefficients for realistic ball flight
        float spinRatio = (Radius * omegaTotal) / vMag;
        float cl = 0.5f * spinRatio; // Increased lift sensitivity
        float cd = 0.25f + 0.15f * spinRatio; // Reduced drag

        float dragMag = 0.5f * AirDensity * Area * cd * (vMag * vMag);
        float liftMag = 0.5f * AirDensity * Area * cl * (vMag * vMag);

        // Vector math
        float fdx = -dragMag * (vx / vMag);
        float fdy = -dragMag * (vy / vMag);
        float fdz = -dragMag * (vz / vMag);

        float flx = 0, fly = 0, flz = 0;
        if (omegaTotal > 0.0f)
        {
            float sx = (float)Math.Sin(spinAxisTilt);
            float sz = -(float)Math.Cos(spinAxisTilt);
            // Cross Product of Velocity and Spin Axis
            flx = ((vy * sz) - (vz * 0)) * (liftMag / vMag);
            fly = ((vz * sx) - (vx * sz)) * (liftMag / vMag);
            flz = ((vx * 0) - (vy * sx)) * (liftMag / vMag);
        }

        vx += ((fdx + flx) / Mass) * TimeStepDt;
        vy += (((fdy + fly) / Mass) - Gravity) * TimeStepDt;
        vz += ((fdz + flz) / Mass) * TimeStepDt;

        x += vx * TimeStepDt;
        y += vy * TimeStepDt;
        z += vz * TimeStepDt;
        currentTime += TimeStepDt;

        if (stepCount++ % 30 == 0)
        {
            path.Add(new TrajectoryPoint { Time = currentTime, DownrangeYds = z * 1.09361f, AltitudeFt = y * 3.28084f, OfflineYds = x * 1.09361f });
        }
        if (y * 3.28084f > ApexHeightFt) ApexHeightFt = y * 3.28084f;
    }
    
    // Final logic for landing (Keep your existing landing interpolation)
    return path;
}
