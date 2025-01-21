import { Card, CardContent } from "./card";
export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  color = "blue",
}) => (
  <Card className="bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
    <CardContent className="flex items-center p-6 gap-4">
      <div className={`p-3 rounded-full bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-500`} />
      </div>
      <div>
        <p className="text-sm text-gray-300">{title}</p>
        <p className="text-2xl font-bold ">{value}</p>
      </div>
    </CardContent>
  </Card>
);
