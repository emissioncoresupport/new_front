import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DPPDataQualityPanel({ qualityResult, onFixIssue }) {
  if (!qualityResult) return null;

  const { overall_score, grade, scores, recommendations } = qualityResult;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50';
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeColor = (gradeColor) => {
    const colors = {
      emerald: 'bg-emerald-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500'
    };
    return colors[gradeColor] || colors.green;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <XCircle className="w-4 h-4 text-red-600" />;
    if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  const getSeverityBadge = (severity) => {
    if (severity === 'critical') return <Badge className="bg-red-100 text-red-700">Critical</Badge>;
    if (severity === 'warning') return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>;
    return <Badge className="bg-blue-100 text-blue-700">Info</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Data Quality Assessment</span>
            <div className="flex items-center gap-3">
              <Award className={`w-6 h-6 ${grade.color === 'emerald' ? 'text-emerald-500' : 
                grade.color === 'green' ? 'text-green-500' : 
                grade.color === 'yellow' ? 'text-yellow-500' : 
                grade.color === 'orange' ? 'text-orange-500' : 'text-red-500'}`} 
              />
              <div className="text-right">
                <div className={`text-3xl font-bold ${getScoreColor(overall_score)}`}>
                  {overall_score}
                </div>
                <div className="text-xs text-slate-500 uppercase">
                  Grade {grade.grade} - {grade.label}
                </div>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Score Breakdown */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <Target className="w-5 h-5 mx-auto mb-2 text-indigo-600" />
                <div className={`text-2xl font-bold ${getScoreColor(scores.completeness.score)}`}>
                  {scores.completeness.score}%
                </div>
                <div className="text-xs text-slate-600 mt-1">Completeness</div>
                <div className="text-xs text-slate-400">
                  {scores.completeness.filled_fields}/{scores.completeness.total_fields} fields
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
                <div className={`text-2xl font-bold ${getScoreColor(scores.accuracy.score)}`}>
                  {scores.accuracy.score}%
                </div>
                <div className="text-xs text-slate-600 mt-1">Accuracy</div>
                <div className="text-xs text-slate-400">
                  {scores.accuracy.accurate_fields}/{scores.accuracy.total_checks} checks
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-600" />
                <div className={`text-2xl font-bold ${getScoreColor(scores.consistency.score)}`}>
                  {scores.consistency.score}%
                </div>
                <div className="text-xs text-slate-600 mt-1">Consistency</div>
                <div className="text-xs text-slate-400">
                  {scores.consistency.consistent_checks}/{scores.consistency.total_checks} checks
                </div>
              </div>

              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <Clock className="w-5 h-5 mx-auto mb-2 text-purple-600" />
                <div className={`text-2xl font-bold ${getScoreColor(scores.recency.score)}`}>
                  {scores.recency.score}%
                </div>
                <div className="text-xs text-slate-600 mt-1">Recency</div>
                {scores.recency.days_since_update !== undefined && (
                  <div className="text-xs text-slate-400">
                    {scores.recency.days_since_update} days old
                  </div>
                )}
              </div>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Data Quality</span>
                <span className="text-slate-500">{overall_score}%</span>
              </div>
              <Progress value={overall_score} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {recommendations.critical_issues.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <div className="font-bold text-red-900 mb-2">
              {recommendations.critical_issues.length} Critical Issue{recommendations.critical_issues.length > 1 ? 's' : ''} Found
            </div>
            <div className="space-y-2">
              {recommendations.critical_issues.slice(0, 3).map((issue, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="font-medium text-red-800">{issue.message}</div>
                      <div className="text-red-600 mt-1">{issue.suggestion}</div>
                    </div>
                  </div>
                </div>
              ))}
              {recommendations.critical_issues.length > 3 && (
                <div className="text-xs text-red-600">
                  +{recommendations.critical_issues.length - 3} more critical issues
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Items */}
      {recommendations.action_items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.action_items.map((action, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  action.priority === 'high' ? 'bg-red-50 border-red-200' :
                  action.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={
                          action.priority === 'high' ? 'border-red-300 text-red-700' :
                          action.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-blue-300 text-blue-700'
                        }>
                          {action.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-slate-500">{action.category}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 mb-1">
                        {action.message}
                      </div>
                      <div className="text-xs text-slate-600">
                        → {action.action}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Issues List */}
      {(recommendations.warning_issues.length > 0 || recommendations.info_issues.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Issues & Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...recommendations.critical_issues, ...recommendations.warning_issues, ...recommendations.info_issues].map((issue, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(issue.severity)}
                      <span className="text-xs text-slate-500 font-mono">{issue.field}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-900">{issue.message}</div>
                    <div className="text-xs text-slate-600 mt-1">💡 {issue.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {overall_score >= 90 && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            <div className="font-bold text-emerald-900">Excellent Data Quality!</div>
            <div className="text-emerald-700 text-sm mt-1">
              Your DPP data meets high quality standards. Ready for publication.
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}