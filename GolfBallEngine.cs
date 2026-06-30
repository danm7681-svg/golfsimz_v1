using System;
using System.Collections.Generic;

namespace GolfsimzV1;

public class GolfBallEngine
{
    // Constants
    public const double Gravity = 9.81;           // m/s²
    public const double BallMass = 0.0459;         // kg (standard golf ball)
    public const double BallRadius = 0.02135;      // meters
    public const double AirDensity = 1.225;        // kg/m³ at sea level
    public const double Cd = 0.25;                 // Drag coefficient
    public const double Cl = 0.18;                 // Lift coefficient (Magnus)
    
    /// <summary>
    /// Calculate a full trajectory given initial launch conditions
    /// </summary>
    public static TrajectoryResult CalculateTrajectory(
        double ballSpeedMph,      // Ball speed in mph
        double launchAngleDeg,    // Launch angle in degrees
        double spinRateRpm,       // Spin rate in rpm
        double spinAxisDeg = 0,   // Spin axis tilt in degrees (0 = straight)
        double windMph = 0,       // Wind speed in mph
        double windDirDeg = 0)    // Wind direction in degrees (0 = headwind)
    {
        // Convert inputs to metric
        double v0 = ballSpeedMph * 0.44704;          // m/s
        double angle = launchAngleDeg * Math.PI / 180.0;
        double spinAxis = spinAxisDeg * Math.PI / 180.0;
        double windSpeed = windMph * 0.44704;
        double windDir = windDirDeg * Math.PI / 180.0;
        double spinRate = spinRateRpm * 2.0 * Math.PI / 60.0;  // rad/s
        
        // Initial velocity components
        double vx = v0 * Math.Cos(angle);
        double vy = v0 * Math.Sin(angle);
        double vz = 0;
        
        // Ball cross-sectional area
        double area = Math.PI * BallRadius * BallRadius;
        
        // Simulation parameters
        double dt = 0.001;           // 1ms timestep
        double maxTime = 15.0;       // Max 15 seconds
        double x = 0, y = 0, z = 0;
        
        var trajectory = new List<TrajectoryPoint>();
        trajectory.Add(new TrajectoryPoint { X = x, Y = y, Z = z });
        
        for (double t = 0; t < maxTime; t += dt)
        {
            // Current speed
            double v = Math.Sqrt(vx * vx + vy * vy + vz * vz);
            
            // Reynolds number
            double Re = AirDensity * v * 2 * BallRadius / 1.81e-5;
            
            // Drag coefficient adjustment for Reynolds number
            double cdAdj = Cd;
            if (Re < 50000) cdAdj = 0.45;
            else if (Re < 120000) cdAdj = 0.28;
            else cdAdj = 0.22;
            
            // Drag force magnitude
            double dragMagnitude = 0.5 * AirDensity * cdAdj * area * v * v;
            
            // Drag acceleration components
            double axDrag = -dragMagnitude / BallMass * (vx / v);
            double ayDrag = -dragMagnitude / BallMass * (vy / v);
            double azDrag = -dragMagnitude / BallMass * (vz / v);
            
            // Magnus force (simplified)
            double magnusMagnitude = 0.5 * AirDensity * Cl * area * v * v;
            double magnusDirX = -Math.Sin(spinAxis);
            double magnusDirZ = Math.Cos(spinAxis);
            
            double axMagnus = magnusMagnitude / BallMass * magnusDirX;
            double azMagnus = magnusMagnitude / BallMass * magnusDirZ;
            
            // Wind effect (simplified)
            double windVx = windSpeed * Math.Cos(windDir);
            double windVz = windSpeed * Math.Sin(windDir);
            
            // Total acceleration
            double ax = axDrag + axMagnus;
            double ay = ayDrag - Gravity;
            double az = azDrag + azMagnus;
            
            // Update velocity
            vx += ax * dt;
            vy += ay * dt;
            vz += az * dt;
            
            // Update position
            x += vx * dt;
            z += vz * dt;
            y += vy * dt;
            
            trajectory.Add(new TrajectoryPoint { X = x, Y = y, Z = z });
            
            // Stop when ball hits ground
            if (y <= 0 && t > 0.1)
            {
                break;
            }
        }
        
        // Calculate results
        double carryYards = x / 0.9144;
        double lateralYards = z / 0.9144;
        
        // Find apex
        double maxY = 0;
        foreach (var p in trajectory)
        {
            if (p.Y > maxY) maxY = p.Y;
        }
        
        // Flight time
        double flightTime = trajectory.Count * dt;
        
        return new TrajectoryResult
        {
            Trajectory = trajectory,
            Carry = carryYards,
            LateralDeviation = lateralYards,
            Apex = maxY / 0.3048,       // Convert to feet
            FlightTime = flightTime,
            BallSpeedMph = ballSpeedMph,
            LaunchAngleDeg = launchAngleDeg,
            SpinRateRpm = spinRateRpm
        };
    }
}

public class TrajectoryPoint
{
    public double X { get; set; }
    public double Y { get; set; }
    public double Z { get; set; }
}

public class TrajectoryResult
{
    public List<TrajectoryPoint> Trajectory { get; set; } = new();
    public double Carry { get; set; }
    public double LateralDeviation { get; set; }
    public double Apex { get; set; }
    public double FlightTime { get; set; }
    public double BallSpeedMph { get; set; }
    public double LaunchAngleDeg { get; set; }
    public double SpinRateRpm { get; set; }
}
