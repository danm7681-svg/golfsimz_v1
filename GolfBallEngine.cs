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

    // Physics constants tuned for 7-iron trajectory
    float dragCoef = 0.22f; 
    float liftCoefBase = 0.35f;

    while (y >= 0.0f && currentTime < 15.0f)
    {
        float vMag = (float)Math.Sqrt(vx * vx + vy * vy + vz * vz);
        if (vMag < 0.1f) break;

        float spinRatio = (Radius * omegaTotal) / vMag;
        
        // Tuned coefficients: lower drag, higher lift
        float cl = liftCoefBase * (1.0f + 0.5f * spinRatio);
        float cd = dragCoef * (1.0f + 0.2f * spinRatio);

        float dragMag = 0.5f * AirDensity * Area * cd * (vMag * vMag);
        float liftMag = 0.5f * AirDensity * Area * cl * (vMag * vMag);

        // Calculate Accelerations
        float ax = (-dragMag * (vx / vMag)) / Mass;
        float ay = ((-dragMag * (vy / vMag)) / Mass) - Gravity + (liftMag / Mass); // Adding lift directly to Y
        float az = (-dragMag * (vz / vMag)) / Mass;

        vx += ax * TimeStepDt;
        vy += ay * TimeStepDt;
        vz += az * TimeStepDt;

        x += vx * TimeStepDt;
        y += vy * TimeStepDt;
        z += vz * TimeStepDt;
        currentTime += TimeStepDt;

        if (currentTime % 0.03f < 0.001f) // Log every ~30ms
        {
            path.Add(new TrajectoryPoint { Time = currentTime, DownrangeYds = z * 1.09361f, AltitudeFt = y * 3.28084f, OfflineYds = x * 1.09361f });
        }
        if (y * 3.28084f > ApexHeightFt) ApexHeightFt = y * 3.28084f;
    }
    return path;
}
