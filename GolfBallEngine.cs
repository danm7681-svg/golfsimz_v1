using System;
using System.Collections.Generic;
using System.Linq;

namespace golfsimz_v1
{
    public class GolfBallEngine
    {
        private readonly float g = 9.81f;
        private readonly float mass = 0.04593f;
        private readonly float radius = 0.021335f;
        private readonly float diameter = 0.04267f;
        private readonly float rho = 1.225f;
        private readonly float mu = 1.81e-5f;

        private readonly float Cd_low = 0.215f;
        private readonly float Cd_high = 0.45f;
        private readonly float Cl_gain = 0.275f;
        private readonly float Cl_exp = 0.55f;
        private readonly float Cl_max = 0.42f;
        private readonly float spin_decay_base = 0.0205f;
        private readonly float spin_decay_factor = 0.0011f;

        public float CarryDistanceYds { get; private set; }
        public float ApexHeightFt { get; private set; }
        public float TotalHangTime { get; private set; }
        public float OfflineYds { get; private set; }
        public float LandingAngleDeg { get; private set; }

        public List<TrajectoryPoint> SimulateShot(float ballSpeedMph, float launchDeg, float sideAngleDeg, float backspinRpm, float sidespinRpm)
        {
            float speedMs = ballSpeedMph * 0.44704f;
            float launchRad = launchDeg * MathF.PI / 180f;
            float sideRad = sideAngleDeg * MathF.PI / 180f;

            float vx = speedMs * MathF.Cos(launchRad) * MathF.Cos(sideRad);
            float vy = speedMs * MathF.Sin(launchRad);
            float vz = speedMs * MathF.Cos(launchRad) * MathF.Sin(sideRad);

            float omega = backspinRpm * 2f * MathF.PI / 60f;
            float omegaSide = sidespinRpm * 2f * MathF.PI / 60f;

            State state = new State { x = 0, y = 0.01f, z = 0, vx = vx, vy = vy, vz = vz, omega = omega, omegaSide = omegaSide };

            float dt = 0.001f;
            float time = 0f;
            List<TrajectoryPoint> points = new List<TrajectoryPoint>();
            float maxHeight = 0f;

            while (time < 15f && state.y >= 0f)
            {
                state = RK4Step(state, dt);
                time += dt;
                points.Add(new TrajectoryPoint
                {
                    DownrangeYds = state.x * 1.09361f,
                    OfflineYds = state.z * 1.09361f,
                    AltitudeFt = state.y * 3.28084f
                });
                if (state.y > maxHeight) maxHeight = state.y;
            }

            CarryDistanceYds = state.x * 1.09361f;
            ApexHeightFt = maxHeight * 3.28084f;
            TotalHangTime = time;
            OfflineYds = state.z * 1.09361f;
            LandingAngleDeg = MathF.Atan2(MathF.Abs(state.vy), MathF.Abs(state.vx)) * 180f / MathF.PI;

            return points;
        }

        private State Dynamics(State s)
        {
            float V = MathF.Sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
            if (V < 0.001f) return new State();

            float Re = (rho * V * diameter) / mu;
            float Sr = (radius * MathF.Abs(s.omega)) / V;

            float trans = 1f / (1f + MathF.Exp((Re - 80000f) / 15000f));
            float Cd_base = Cd_high * trans + Cd_low * (1f - trans);
            float Cd = Cd_base + 0.11f * Sr;

            float v_ref = 45f;
            float lift_scalar = V > v_ref ? MathF.Max(0.72f, 1f - 0.012f * (V - v_ref)) : 1f;
            float Cl = Cl_gain * lift_scalar * MathF.Pow(Sr, Cl_exp);
            Cl = MathF.Min(Cl, Cl_max) * MathF.Sign(s.omega);

            float qA = 0.5f * rho * V * V * MathF.PI * radius * radius;
            float Fd = qA * Cd;
            float Fl = qA * Cl;

            float cos_phi = s.vx / V;
            float sin_phi = s.vy / V;

            float ax = (-Fd * cos_phi - Fl * sin_phi) / mass;
            float ay = (-g * mass - Fd * sin_phi + Fl * cos_phi) / mass;
            float az = 0f;

            float decay = spin_decay_base * (1f + spin_decay_factor * MathF.Abs(s.omega));
            float domega = -decay * s.omega;

            return new State
            {
                x = s.vx,
                y = s.vy,
                z = s.vz,
                vx = ax,
                vy = ay,
                vz = az,
                omega = domega,
                omegaSide = 0
            };
        }

        private State RK4Step(State s, float dt)
        {
            State k1 = Dynamics(s);
            State k2 = Dynamics(s + k1 * (dt * 0.5f));
            State k3 = Dynamics(s + k2 * (dt * 0.5f));
            State k4 = Dynamics(s + k3 * dt);

            return s + (dt / 6f) * (k1 + 2f * k2 + 2f * k3 + k4);
        }

        private struct State
        {
            public float x, y, z;
            public float vx, vy, vz;
            public float omega, omegaSide;

            public static State operator +(State a, State b) => new State
            {
                x = a.x + b.x,
                y = a.y + b.y,
                z = a.z + b.z,
                vx = a.vx + b.vx,
                vy = a.vy + b.vy,
                vz = a.vz + b.vz,
                omega = a.omega + b.omega,
                omegaSide = a.omegaSide + b.omegaSide
            };

            public static State operator *(State a, float b) => new State
            {
                x = a.x * b,
                y = a.y * b,
                z = a.z * b,
                vx = a.vx * b,
                vy = a.vy * b,
                vz = a.vz * b,
                omega = a.omega * b,
                omegaSide = a.omegaSide * b
            };

            public static State operator *(float b, State a) => new State
            {
                x = a.x * b,
                y = a.y * b,
                z = a.z * b,
                vx = a.vx * b,
                vy = a.vy * b,
                vz = a.vz * b,
                omega = a.omega * b,
                omegaSide = a.omegaSide * b
            };
        }
    }

    public struct TrajectoryPoint
    {
        public float DownrangeYds { get; set; }
        public float OfflineYds { get; set; }
        public float AltitudeFt { get; set; }
    }
}