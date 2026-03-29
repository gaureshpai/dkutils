import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@frontend/components/ui/card";
import PropTypes from "prop-types";

const ToolCard = ({ title, description, children }) => {
	return (
		<Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className="grow">{children}</CardContent>
		</Card>
	);
};

ToolCard.propTypes = {
	title: PropTypes.string.isRequired,
	description: PropTypes.string,
	children: PropTypes.node,
};

export default ToolCard;
