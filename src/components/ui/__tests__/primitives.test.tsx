/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { Alert, AlertTitle, AlertDescription } from "../alert";
import { Avatar, AvatarFallback } from "../avatar";
import { Label } from "../label";
import { Separator } from "../separator";
import { Skeleton } from "../skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";

describe("UI Primitives Component Test Suite", () => {
  describe("Alert Component", () => {
    it("renders default alert with title and description", () => {
      render(
        <Alert>
          <AlertTitle>Machine Scheduled</AlertTitle>
          <AlertDescription>Hydraulic 10/7 dispatched to site.</AlertDescription>
        </Alert>
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Machine Scheduled")).toBeInTheDocument();
      expect(screen.getByText("Hydraulic 10/7 dispatched to site.")).toBeInTheDocument();
    });

    it("renders destructive variant with appropriate styling", () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Engine Overheat</AlertTitle>
          <AlertDescription>De-watering pump halted by field operator.</AlertDescription>
        </Alert>
      );
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("text-destructive");
    });
  });

  describe("Avatar Component", () => {
    it("renders avatar fallback with operator initials", () => {
      render(
        <Avatar>
          <AvatarFallback>RM</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText("RM")).toBeInTheDocument();
      expect(screen.getByText("RM")).toHaveAttribute("data-slot", "avatar-fallback");
    });

    it("renders avatar with custom size", () => {
      render(
        <Avatar size="lg" data-testid="avatar-lg">
          <AvatarFallback>OP</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId("avatar-lg");
      expect(avatar).toHaveAttribute("data-size", "lg");
    });
  });

  describe("Label Component", () => {
    it("renders label with text content and data-slot", () => {
      render(<Label htmlFor="diesel-liters">Fuel In Liters</Label>);
      const label = screen.getByText("Fuel In Liters");
      expect(label).toBeInTheDocument();
      expect(label).toHaveAttribute("for", "diesel-liters");
      expect(label).toHaveAttribute("data-slot", "label");
    });
  });

  describe("Separator Component", () => {
    it("renders horizontal separator by default", () => {
      render(<Separator data-testid="sep-h" />);
      const sep = screen.getByTestId("sep-h");
      expect(sep).toHaveAttribute("data-slot", "separator");
      expect(sep).toHaveAttribute("data-orientation", "horizontal");
    });

    it("renders vertical separator when specified", () => {
      render(<Separator orientation="vertical" data-testid="sep-v" />);
      const sep = screen.getByTestId("sep-v");
      expect(sep).toHaveAttribute("data-orientation", "vertical");
    });
  });

  describe("Skeleton Component", () => {
    it("renders skeleton placeholder with pulse animation", () => {
      render(<Skeleton className="h-6 w-32" data-testid="skel" />);
      const skel = screen.getByTestId("skel");
      expect(skel).toHaveAttribute("data-slot", "skeleton");
      expect(skel.className).toContain("animate-pulse");
      expect(skel.className).toContain("h-6");
    });
  });

  describe("Table Component", () => {
    it("renders structured tabular data for fleet overview", () => {
      render(
        <Table>
          <TableCaption>Active Plant Fleet</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Machine ID</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>MC-101</TableCell>
              <TableCell>Rajan Pillai</TableCell>
              <TableCell>On-Site</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText("Active Plant Fleet")).toBeInTheDocument();
      expect(screen.getByText("Machine ID")).toBeInTheDocument();
      expect(screen.getByText("MC-101")).toBeInTheDocument();
      expect(screen.getByText("Rajan Pillai")).toBeInTheDocument();
      expect(screen.getByText("On-Site")).toBeInTheDocument();
    });
  });

  describe("Tabs Component", () => {
    it("renders tabs list with tab items and panel", () => {
      render(
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Dispatches</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
          <TabsContent value="all">Displaying 14 active jobs</TabsContent>
          <TabsContent value="pending">2 waiting for driver</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("All Dispatches")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Displaying 14 active jobs")).toBeInTheDocument();
    });
  });
});
