import React from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import useAnalytics from "../utils/useAnalytics";

const ToolCard = ({ title, description, children }) => {
  const { trackToolUsage } = useAnalytics();
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow">{children}</CardContent>
    </Card>
  );
};

ToolCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  children: PropTypes.node,
};

export default ToolCard;
