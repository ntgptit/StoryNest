-- FP-031 (reporter side): a reporter takes back a report that nobody has started on.
--
--   withdraw_report(p_report_id) -> 'dismissed'
--     only the reporter, only while the report is still pending (once a moderator is looking at it, it is theirs);
--     closes the report as dismissed, marks content_reports.withdrawn_at so the reporter's list can say "withdrawn",
--     and writes the audit row (dismiss_report, actor = the reporter, reason says it was withdrawn).
-- It does not refund the reporter's rate-limit allowance: withdrawing is not a way to report without limit.
--
-- Rollback: DROP FUNCTION public.withdraw_report(uuid); ALTER TABLE public.content_reports DROP COLUMN withdrawn_at;
BEGIN;

ALTER TABLE public.content_reports ADD COLUMN withdrawn_at timestamptz;

CREATE FUNCTION public.withdraw_report(p_report_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_uid uuid := (SELECT auth.uid());
    v_report public.content_reports%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO v_report FROM public.content_reports WHERE id = p_report_id AND reporter_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'report not found' USING ERRCODE = 'PT404';
    END IF;
    IF v_report.status <> 'pending' THEN
        RAISE EXCEPTION 'a moderator already started on this report' USING ERRCODE = 'PT409';
    END IF;

    UPDATE public.content_reports
       SET status = 'dismissed', reviewed_at = now(), withdrawn_at = now()
     WHERE id = p_report_id;
    INSERT INTO public.moderation_actions (actor_id, action, target_kind, target_id, report_id, reason)
    VALUES (v_uid, 'dismiss_report', 'report', p_report_id, p_report_id, 'Withdrawn by the reporter');
    RETURN 'dismissed';
END $$;

REVOKE ALL ON FUNCTION public.withdraw_report(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_report(uuid) TO authenticated;

COMMIT;
