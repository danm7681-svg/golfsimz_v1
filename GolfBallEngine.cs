using System;
using System.Collections.Generic;

namespace golfsimz_v1
{
    public class TrajectoryPoint
    {
        public float Time { get; set; }
        public float DownrangeYds { get; set; }
        public float AltitudeFt { get; set; }
        public float OfflineYds { get; set; }
    }

    public class GolfBallEngine
    {
        private const float Mass = 0.04593f;       
        private const float Radius = 0.02135f;     
        private const float Area = 0.00143256f;    
        private const float Gravity = 9.80665f;
        private const float AirDensity = 1.225f;    
        private const float TimeStepDt = 0.001f;

        public float CarryDistanceYds { get; private set; }
        public float ApexHeightFt { get; private set; }
        public float OfflineYds { get; private set; }
        public float TotalHangTime { get; private set; }

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

            float omegaTotalRpm = (float)Math.Sqrt(backspinRpm * backspinRpm + sidespinRpm * sidespinRpm);
            float omegaTotal = (omegaTotalRpm * 2.0f * (float)Math.PI) / 60.0f;
            float spinAxisTilt = (float)Math.Atan2(sidespinRpm, backspinRpm);

            float currentTime = 0.0f;
            ApexHeightFt = 0.0f;
            int stepCount = 0;

            float lastX = 0, lastY = 0, lastZ = 0, lastTime = 0;

            while (y >= 0.0f && currentTime < 15.0f)
            {
                float vMag = (float)Math.Sqrt(vx*vx + vy*vy + vz*vz);
                if (vMag < 0.1f) break;

                float spinRatio = (Radius * omegaTotal) / vMag;
                float cl = spinRatio < 0.1f ? 1.8f * spinRatio : 0.14f + 0.4f * (spinRatio - 0.1f);
                cl = Math.Min(cl, 0.38f);

                float cd = 0.22f + 0.35f * spinRatio + 0.28f * (spinRatio * spinRatio);
                cd = Math.Min(cd, 0.65f);

                float dragMag = 0.5f * AirDensity * Area * cd * (vMag * vMag);
                float liftMag = 0.5f * AirDensity * Area * cl * (vMag * vMag);

                float fdx = -dragMag * (vx / vMag);
                float fdy = -dragMag * (vy / vMag);
                float fdz = -dragMag * (vz / vMag);

                float flx = 0, fly = 0, flz = 0;
                if (omegaTotal > 0.0f)
                {
                    float hlx = -vz; float hlz = vx;
                    float hlMag = (float)Math.Sqrt(hlx*hlx + hlz*hlz);
                    if (hlMag > 0.001f) { hlx /= hlMag; hlz /= hlMag; }

                    float hly = 0;
                    float uux = (vy * hlz) - (vz * hly);
                    float uuy = (vz * hlx) - (vx * hlz);
                    float uuz = (vx * hly) - (vy * hlx);
                    float uuMag = (float)Math.Sqrt(uux*uux + uuy*uuy + uuz*uuz);
                    if (uuMag > 0.001f) { uux /= uuMag; uuy /= uuMag; uuz /= uuMag; }

                    float ldx = (uux * (float)Math.Cos(spinAxisTilt)) + (hlx * (float)Math.Sin(spinAxisTilt));
                    float ldy = (uuy * (float)Math.Cos(spinAxisTilt)) + (hly * (float)Math.Sin(spinAxisTilt));
                    float ldz = (uuz * (float)Math.Cos(spinAxisTilt)) + (hlz * (float)Math.Sin(spinAxisTilt));

                    flx = ldx * liftMag; fly = ldy * liftMag; flz = ldz * liftMag;
                }

                float ax = (fdx + flx) / Mass;
                float ay = ((fdy + fly) / Mass) - Gravity;
                float az = (fdz + flz) / Mass;

                lastX = x; lastY = y; lastZ = z; lastTime = currentTime;

                vx += ax * TimeStepDt; vy += ay * TimeStepDt; vz += az * TimeStepDt;
                x += vx * TimeStepDt; y += vy * TimeStepDt; z += vz * TimeStepDt;
                currentTime += TimeStepDt;
                stepCount++;

                float currentAlt = y * 3.28084f;
                if (currentAlt > ApexHeightFt) ApexHeightFt = currentAlt;

                if (stepCount % 30 == 0 && y >= 0.0f)
                {
                    path.Add(new TrajectoryPoint { Time = currentTime, DownrangeYds = z * 1.09361f, AltitudeFt = Math.Max(0, currentAlt), OfflineYds = x * 1.09361f });
                }
            }

            if (lastY > 0.0f && y < 0.0f)
            {
                float frac = lastY / (lastY - y);
                CarryDistanceYds = (lastZ + (z - lastZ) * frac) * 1.09361f;
                OfflineYds = (lastX + (x - lastX) * frac) * 1.09361f;
                TotalHangTime = lastTime + (currentTime - lastTime) * frac;
                path.Add(new TrajectoryPoint { Time = TotalHangTime, DownrangeYds = CarryDistanceYds, AltitudeFt = 0, OfflineYds = OfflineYds });
            }
            return path;
        }
    }
}
